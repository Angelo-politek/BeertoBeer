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

import type { Coords } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import type {
    BeerItem,
    BeerRequest,
    BlockedUser,
    CreditTransaction,
    Message,
    OrderStatus,
    ReportReason,
    Review,
    User,
} from '@/types';

const PROFILE_COLUMNS = 'id, nome, foto_url, bio, preferenze_birra, rating_medio, eta, scambi_completati';
const ORDER_COLUMNS =
  'id, host_id, driver_id, lista_birre, indirizzo, lat, lng, fascia, stato, vibe_mode, crediti_offerti, host_confermato, driver_confermato, created_at, citta';
const REVIEW_COLUMNS = 'id, order_id, from_user_id, to_user_id, voto, commento, created_at';
const MESSAGE_COLUMNS = 'id, order_id, sender_id, testo, created_at';

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
    supabase.from('users').select('crediti_saldo, is_admin').eq('id', id).single(),
    supabase.from('public_profiles').select(PROFILE_COLUMNS).eq('id', id).single(),
  ]);
  if (priv.error) throw priv.error;
  if (pub.error) throw pub.error;
  const privData = priv.data as { crediti_saldo: number; is_admin: boolean };
  return {
    ...mapPublicProfile(pub.data as PublicProfileRow),
    creditiSaldo: privData.crediti_saldo,
    isAdmin: privData.is_admin,
  };
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
  citta: string | null;
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
    citta: row.citta,
  };
}

/** Carica gli ordini dati + i profili host, e li mappa in BeerRequest[]. */
async function withHosts(rows: OrderRow[]): Promise<BeerRequest[]> {
  const hosts = await fetchProfiles(rows.map((r) => r.host_id));
  return rows.map((r) => mapOrder(r, hosts.get(r.host_id)));
}

type ReviewRow = {
  id: string;
  order_id: string;
  from_user_id: string;
  to_user_id: string;
  voto: number;
  commento: string | null;
  created_at: string;
};

function mapReview(row: ReviewRow, author?: User): Review {
  return {
    id: row.id,
    orderId: row.order_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    voto: row.voto,
    commento: row.commento ?? undefined,
    createdAt: row.created_at,
    author,
  };
}

type MessageRow = {
  id: string;
  order_id: string;
  sender_id: string;
  testo: string;
  created_at: string;
};

function mapMessage(row: MessageRow, sender?: User): Message {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    testo: row.testo,
    createdAt: row.created_at,
    sender,
  };
}

/**
 * Le richieste aperte pubblicate da ALTRI nella città selezionata: il feed dei
 * driver. Legge dalla vista `open_requests` (senza indirizzo): l'indirizzo esatto
 * si vede solo dopo aver accettato, quando si diventa partecipanti dell'ordine.
 * Gli ordini storici senza città (citta NULL) restano fuori dal feed.
 */
export async function getRequests(citta: string): Promise<BeerRequest[]> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('open_requests')
    .select(ORDER_COLUMNS)
    .neq('host_id', id)
    .eq('citta', citta)
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
  /** chiave della città selezionata (lib/cities.ts). */
  citta: string;
  /** coordinate di consegna (geocodate dall'indirizzo). */
  lat?: number | null;
  lng?: number | null;
};

/**
 * Crea una richiesta a nome dell'utente corrente. Ritorna l'id del nuovo ordine.
 * I crediti NON si passano: li calcola il trigger `set_order_credits` (solo peso,
 * cap 10) e blocca la creazione se l'host non ha crediti sufficienti.
 */
export async function createOrder(input: NewOrder): Promise<string> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('orders')
    .insert({
      host_id: id,
      lista_birre: input.birre,
      indirizzo: input.indirizzo.trim(),
      citta: input.citta,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      fascia: input.fascia ?? null,
      vibe_mode: input.vibeMode,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Un driver accetta una richiesta aperta. Le coordinate (opzionali: GPS negato
 * → null) servono al server SOLO per calcolare il bonus distanza dei crediti;
 * non vengono salvate.
 */
export async function acceptOrder(orderId: string, coords?: Coords | null): Promise<void> {
  const { error } = await supabase.rpc('accept_order', {
    p_order_id: orderId,
    p_lat: coords?.lat ?? null,
    p_lng: coords?.lng ?? null,
  });
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

// ---------- Reviews / report / blocchi ----------

export type ReviewContext = {
  order: BeerRequest;
  target: User;
  existingReview: Review | null;
};

export async function getReviewContext(orderId: string): Promise<ReviewContext | null> {
  const myId = await requireUserId();
  const { data, error } = await supabase.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle();
  if (error) throw error;
  const row = data as OrderRow | null;
  if (!row || row.stato !== 'confermato' || !row.driver_id) return null;
  if (row.host_id !== myId && row.driver_id !== myId) return null;

  const profiles = await fetchProfiles([row.host_id, row.driver_id]);
  const targetId = row.host_id === myId ? row.driver_id : row.host_id;
  const target = profiles.get(targetId);
  const host = profiles.get(row.host_id);
  if (!target || !host) return null;

  const existing = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('order_id', orderId)
    .eq('from_user_id', myId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  return {
    order: mapOrder(row, host),
    target,
    existingReview: existing.data ? mapReview(existing.data as ReviewRow, profiles.get(myId)) : null,
  };
}

export async function submitReview(orderId: string, voto: number, commento: string): Promise<void> {
  const { error } = await supabase.rpc('submit_review', {
    p_order_id: orderId,
    p_voto: voto,
    p_commento: commento.trim() || null,
  });
  if (error) throw error;
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []) as ReviewRow[];
  const authors = await fetchProfiles(rows.map((r) => r.from_user_id));
  return rows.map((r) => mapReview(r, authors.get(r.from_user_id)));
}

export async function reportUser(userId: string, reason: ReportReason, details: string, orderId?: string): Promise<void> {
  const myId = await requireUserId();
  const motivo = details.trim() ? `${reason}: ${details.trim()}` : reason;
  const { error } = await supabase.from('reports').insert({
    reported_user_id: userId,
    reporting_user_id: myId,
    order_id: orderId ?? null,
    motivo,
  });
  if (error) throw error;
}

export async function blockUser(userId: string): Promise<void> {
  const myId = await requireUserId();
  const { error } = await supabase.from('blocks').upsert(
    { blocker_user_id: myId, blocked_user_id: userId },
    { onConflict: 'blocker_user_id,blocked_user_id' },
  );
  if (error) throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const myId = await requireUserId();
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_user_id', myId)
    .eq('blocked_user_id', userId);
  if (error) throw error;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_user_id', myId)
    .eq('blocked_user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('blocks')
    .select('id, blocker_user_id, blocked_user_id, created_at')
    .eq('blocker_user_id', myId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    blocker_user_id: string;
    blocked_user_id: string;
    created_at: string;
  }[];
  const profiles = await fetchProfiles(rows.map((r) => r.blocked_user_id));
  return rows.map((r) => ({
    id: r.id,
    blockerUserId: r.blocker_user_id,
    blockedUserId: r.blocked_user_id,
    createdAt: r.created_at,
    user: profiles.get(r.blocked_user_id),
  }));
}

// ---------- Chat + push token ----------

export async function getMessages(orderId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as MessageRow[];
  const senders = await fetchProfiles(rows.map((r) => r.sender_id));
  return rows.map((r) => mapMessage(r, senders.get(r.sender_id)));
}

export async function sendMessage(orderId: string, testo: string): Promise<void> {
  const senderId = await requireUserId();
  const clean = testo.trim();
  if (!clean) return;
  const { error } = await supabase.from('messages').insert({ order_id: orderId, sender_id: senderId, testo: clean });
  if (error) throw error;
}

export function subscribeToMessages(orderId: string, onMessage: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${orderId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      (payload) => onMessage(mapMessage(payload.new as MessageRow)),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function savePushToken(token: string, platform: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'token' },
  );
  if (error) throw error;
}

export type AdminReport = {
  id: string;
  reportedUserId: string;
  reportingUserId: string;
  orderId: string | null;
  motivo: string;
  createdAt: string;
  reportedUser?: User;
  reportingUser?: User;
};

export async function getAdminReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, reported_user_id, reporting_user_id, order_id, motivo, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    reported_user_id: string;
    reporting_user_id: string;
    order_id: string | null;
    motivo: string;
    created_at: string;
  }[];
  const profiles = await fetchProfiles(rows.flatMap((r) => [r.reported_user_id, r.reporting_user_id]));
  return rows.map((r) => ({
    id: r.id,
    reportedUserId: r.reported_user_id,
    reportingUserId: r.reporting_user_id,
    orderId: r.order_id,
    motivo: r.motivo,
    createdAt: r.created_at,
    reportedUser: profiles.get(r.reported_user_id),
    reportingUser: profiles.get(r.reporting_user_id),
  }));
}

export async function deleteAdminReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', reportId);
  if (error) throw error;
}
