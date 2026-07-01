/**
 * LAYER DATI — l'unico punto da cui le schermate leggono/scrivono i dati.
 *
 * Tutte le funzioni parlano con Supabase:
 * - Profilo:   getCurrentUser / updateCurrentUserProfile / getUserById
 * - Feed:      getRequests (richieste aperte) / getMyOrders / getRequestById / createOrder
 * - Ciclo:     acceptOrder / advanceOrder / confirmOrder / cancelOrder
 * - Wallet:    getCreditBalance / getTransactions
 *
 * I profili altrui si leggono dalla vista `public_profiles` (solo campi pubblici).
 * Le transizioni di stato passano da funzioni RPC SECURITY DEFINER lato DB.
 */

import { supabase } from '@/lib/supabase';
import type { BeerItem, BeerRequest, CreditTransaction, OrderStatus, User } from '@/types';

const PROFILE_COLUMNS = 'id, nome, foto_url, bio, preferenze_birra, rating_medio, eta, scambi_completati';
const ORDER_COLUMNS =
  'id, host_id, driver_id, lista_birre, indirizzo, lat, lng, fascia, stato, vibe_mode, crediti_offerti, host_confermato, driver_confermato, created_at';

// ---------- Helper sessione ----------

/**
 * Recupera l'id dell'utente loggato, o lancia se la sessione manca.
 * Usa getSession() (lettura locale da AsyncStorage, niente rete): così le
 * schermate caricano anche offline finché la sessione salvata è valida.
 */
async function requireUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Nessun utente loggato.');
  return session.user.id;
}

// ---------- Profili ----------

type PublicProfileRow = {
  id: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  preferenze_birra: string | null;
  rating_medio: number;
  eta: number;
  scambi_completati: number;
};

/** Profilo pubblico (vista) → tipo di dominio User. Il saldo crediti non è pubblico. */
function mapPublicProfile(row: PublicProfileRow): User {
  return {
    id: row.id,
    nome: row.nome,
    eta: row.eta,
    bio: row.bio ?? '',
    ratingMedio: Number(row.rating_medio),
    scambiCompletati: row.scambi_completati,
    creditiSaldo: 0,
    preferenzeBirra: row.preferenze_birra ?? undefined,
    fotoUrl: row.foto_url ?? undefined,
  };
}

/** Utente segnaposto quando un profilo collegato non è leggibile. */
const UNKNOWN_USER: User = {
  id: '',
  nome: 'Utente',
  eta: 0,
  bio: '',
  ratingMedio: 0,
  scambiCompletati: 0,
  creditiSaldo: 0,
};

/** Carica più profili pubblici in un colpo solo, indicizzati per id. */
async function fetchProfiles(ids: string[]): Promise<Map<string, User>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, User>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.from('public_profiles').select(PROFILE_COLUMNS).in('id', unique);
  if (error) throw error;
  for (const row of (data ?? []) as PublicProfileRow[]) map.set(row.id, mapPublicProfile(row));
  return map;
}

/** Profilo dell'utente corrente ("tu"): campi pubblici + saldo crediti privato. */
export async function getCurrentUser(): Promise<User> {
  const id = await requireUserId();
  const [priv, pub] = await Promise.all([
    supabase.from('users').select('crediti_saldo').eq('id', id).single(),
    supabase.from('public_profiles').select(PROFILE_COLUMNS).eq('id', id).single(),
  ]);
  if (priv.error) throw priv.error;
  if (pub.error) throw pub.error;
  return { ...mapPublicProfile(pub.data as PublicProfileRow), creditiSaldo: (priv.data as { crediti_saldo: number }).crediti_saldo };
}

/** Profilo pubblico di un utente qualsiasi (null se non leggibile). */
export async function getUserById(id: string): Promise<User | null> {
  const profiles = await fetchProfiles([id]);
  return profiles.get(id) ?? null;
}

/** Campi del profilo modificabili dall'utente. */
export type ProfileUpdate = {
  nome: string;
  bio: string;
  preferenzeBirra: string;
};

/** Aggiorna la propria riga in `users` (consentito dalla policy RLS users_update_own). */
export async function updateCurrentUserProfile(input: ProfileUpdate): Promise<void> {
  const id = await requireUserId();
  const { error } = await supabase
    .from('users')
    .update({
      nome: input.nome.trim(),
      bio: input.bio.trim() || null,
      preferenze_birra: input.preferenzeBirra.trim() || null,
    })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Ordini (feed + ciclo di vita) ----------

type OrderRow = {
  id: string;
  host_id: string;
  driver_id: string | null;
  lista_birre: BeerItem[] | null;
  indirizzo: string | null;
  lat: number | null;
  lng: number | null;
  fascia: string | null;
  stato: OrderStatus;
  vibe_mode: boolean;
  crediti_offerti: number;
  host_confermato: boolean;
  driver_confermato: boolean;
  created_at: string;
};

/** Riga ordine (+ profilo host) → BeerRequest per la UI. */
function mapOrder(row: OrderRow, host: User | undefined): BeerRequest {
  return {
    id: row.id,
    host: host ?? UNKNOWN_USER,
    driverId: row.driver_id,
    birre: row.lista_birre ?? [],
    indirizzo: row.indirizzo ?? '',
    lat: row.lat,
    lng: row.lng,
    fascia: row.fascia ?? undefined,
    stato: row.stato,
    vibeMode: row.vibe_mode,
    creditiOfferti: row.crediti_offerti,
    hostConfermato: row.host_confermato,
    driverConfermato: row.driver_confermato,
    createdAt: row.created_at,
  };
}

/** Carica gli ordini dati + i profili host, e li mappa in BeerRequest[]. */
async function withHosts(rows: OrderRow[]): Promise<BeerRequest[]> {
  const hosts = await fetchProfiles(rows.map((r) => r.host_id));
  return rows.map((r) => mapOrder(r, hosts.get(r.host_id)));
}

/**
 * Le richieste aperte pubblicate da ALTRI: il feed dei driver.
 * Legge dalla vista `open_requests` (senza indirizzo): l'indirizzo esatto si vede
 * solo dopo aver accettato, quando si diventa partecipanti dell'ordine.
 */
export async function getRequests(): Promise<BeerRequest[]> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('open_requests')
    .select(ORDER_COLUMNS)
    .neq('host_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return withHosts((data ?? []) as OrderRow[]);
}

/** Gli ordini in cui sono coinvolto (come host o come driver), più recenti prima. */
export async function getMyOrders(): Promise<BeerRequest[]> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .or(`host_id.eq.${id},driver_id.eq.${id}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return withHosts((data ?? []) as OrderRow[]);
}

/**
 * Una singola richiesta per id (null se inesistente o non leggibile).
 * Prima la cerca nella tabella `orders` come PARTECIPANTE (host o driver) — così
 * vede anche l'indirizzo; se non è partecipante, ricade sulla vista `open_requests`
 * (richiesta aperta che sta valutando), che non espone l'indirizzo.
 */
export async function getRequestById(id: string): Promise<BeerRequest | null> {
  const asParticipant = await supabase.from('orders').select(ORDER_COLUMNS).eq('id', id).maybeSingle();
  if (asParticipant.error) throw asParticipant.error;

  let row = asParticipant.data as OrderRow | null;
  if (!row) {
    const asOpen = await supabase.from('open_requests').select(ORDER_COLUMNS).eq('id', id).maybeSingle();
    if (asOpen.error) throw asOpen.error;
    row = asOpen.data as OrderRow | null;
  }
  if (!row) return null;

  const hosts = await fetchProfiles([row.host_id]);
  return mapOrder(row, hosts.get(row.host_id));
}

/** Dati per creare una nuova richiesta. */
export type NewOrder = {
  birre: BeerItem[];
  indirizzo: string;
  fascia?: string;
  vibeMode: boolean;
  creditiOfferti: number;
};

/** Crea una richiesta a nome dell'utente corrente. Ritorna l'id del nuovo ordine. */
export async function createOrder(input: NewOrder): Promise<string> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('orders')
    .insert({
      host_id: id,
      lista_birre: input.birre,
      indirizzo: input.indirizzo.trim(),
      fascia: input.fascia ?? null,
      vibe_mode: input.vibeMode,
      crediti_offerti: input.creditiOfferti,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Un driver accetta una richiesta aperta. */
export async function acceptOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_order', { p_order_id: orderId });
  if (error) throw error;
}

/** Il driver avanza lo stato (accettato → in_consegna → consegnato). */
export async function advanceOrder(orderId: string, newStato: OrderStatus): Promise<void> {
  const { error } = await supabase.rpc('advance_order', { p_order_id: orderId, p_new_stato: newStato });
  if (error) throw error;
}

/** Host o driver conferma lo scambio; a entrambe le conferme i crediti si spostano. */
export async function confirmOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_order', { p_order_id: orderId });
  if (error) throw error;
}

/** L'host cancella una propria richiesta ancora aperta. */
export async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
}

// ---------- Wallet ----------

/** Saldo crediti dell'utente corrente. */
export async function getCreditBalance(): Promise<number> {
  const id = await requireUserId();
  const { data, error } = await supabase.from('users').select('crediti_saldo').eq('id', id).single();
  if (error) throw error;
  return (data as { crediti_saldo: number }).crediti_saldo;
}

type TransactionRow = {
  id: string;
  order_id: string | null;
  from_user_id: string | null;
  to_user_id: string | null;
  importo: number;
  tipo: string;
  created_at: string;
};

/** Storico movimenti crediti dell'utente corrente (entrata = ricevuti, uscita = spesi). */
export async function getTransactions(): Promise<CreditTransaction[]> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, order_id, from_user_id, to_user_id, importo, tipo, created_at')
    .or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as TransactionRow[];
  const otherIds = rows
    .map((t) => (t.to_user_id === id ? t.from_user_id : t.to_user_id))
    .filter((x): x is string => !!x);
  const profiles = await fetchProfiles(otherIds);

  return rows.map((t) => {
    const incoming = t.to_user_id === id;
    const otherId = incoming ? t.from_user_id : t.to_user_id;
    const otherName = (otherId && profiles.get(otherId)?.nome) || 'un altro utente';
    return {
      id: t.id,
      descrizione: incoming ? `Consegna a ${otherName}` : `Consegna da ${otherName}`,
      importo: t.importo,
      tipo: incoming ? 'entrata' : 'uscita',
      data: t.created_at,
    };
  });
}
