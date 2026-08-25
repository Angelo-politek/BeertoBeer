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

import { sogliaIncontriVisibili } from '@/lib/events';
import type { Coords } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import type {
    BeerEvent,
    BeerItem,
    BeerRequest,
    BlockedUser,
    CommunityFeedItem,
    ComplimentCount,
    CreditTransaction,
    CityGoal,
    LeaderboardEntry,
    Message,
    OrderStatus,
    OrderSafetyEvent,
    DeliveryCodeState,
    NotificationItem,
    OrderIssueType,
    ProductFeedback,
    ReciprocitySummary,
    UrbanMission,
    Invite,
    ReportReason,
    Review,
    User,
    UserBadge,
    ProfileCustomization,
    ProfilePhotoVisibility,
    ProfileSticker,
    ZoneHolder,
} from '@/types';

const PROFILE_COLUMNS =
  'id, nome, foto_url, bio, preferenze_birra, rating_medio, eta, scambi_completati, livello, karma, interessi, cerco_compagnia, citta';
const ORDER_COLUMNS =
  'id, host_id, driver_id, lista_birre, indirizzo, lat, lng, fascia, stato, vibe_mode, crediti_offerti, host_confermato, driver_confermato, created_at, updated_at, citta, stato_moderazione';
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
  livello: number | null;
  karma: number | null;
  interessi: string[] | null;
  cerco_compagnia: boolean | null;
  citta: string | null;
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
    livello: row.livello ?? 0,
    karma: row.karma ?? 0,
    interessi: row.interessi ?? [],
    cercoCompagnia: row.cerco_compagnia ?? false,
    citta: row.citta ?? undefined,
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
    supabase.from('users').select('crediti_saldo, is_admin, sospeso_fino, citta').eq('id', id).single(),
    supabase.from('public_profiles').select(PROFILE_COLUMNS).eq('id', id).single(),
  ]);
  if (priv.error) throw priv.error;
  if (pub.error) throw pub.error;
  const privData = priv.data as {
    crediti_saldo: number;
    is_admin: boolean;
    sospeso_fino: string | null;
    citta: string | null;
  };
  return {
    ...mapPublicProfile(pub.data as PublicProfileRow),
    creditiSaldo: privData.crediti_saldo,
    isAdmin: privData.is_admin,
    sospesoFino: privData.sospeso_fino,
    citta: privData.citta,
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
  interessi?: string[];
  cercoCompagnia?: boolean;
};

/** Aggiorna la propria riga in `users` (consentito dalla policy RLS users_update_own). */
export async function updateCurrentUserProfile(input: ProfileUpdate): Promise<void> {
  const id = await requireUserId();
  const patch: Record<string, unknown> = {
    nome: input.nome.trim(),
    bio: input.bio.trim() || null,
    preferenze_birra: input.preferenzeBirra.trim() || null,
  };
  if (input.interessi !== undefined) patch.interessi = input.interessi;
  if (input.cercoCompagnia !== undefined) patch.cerco_compagnia = input.cercoCompagnia;
  const { error } = await supabase.from('users').update(patch).eq('id', id);
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
  updated_at: string | null;
  citta: string | null;
  stato_moderazione: string;
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
    updatedAt: row.updated_at ?? undefined,
    citta: row.citta,
    statoModerazione: row.stato_moderazione,
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

type ProfileCustomizationPayload = {
  user_id?: string;
  status_phrase?: string | null;
  beer_tastes?: string[] | null;
  availability?: string[] | null;
  photo_visibility?: ProfilePhotoVisibility | null;
  photos?: { id: string; url: string; storage_path: string; position: number }[] | null;
  stickers?: { key: string; title: string; asset_key: string; description?: string; unlocked?: boolean; unlock_hint?: string; slot?: number; scale?: number; rotation?: number }[] | null;
};

export async function getProfileCustomization(userId?: string): Promise<ProfileCustomization> {
  const id = userId ?? await requireUserId();
  const { data, error } = await supabase.rpc('get_profile_customization', { p_user_id: id });
  if (error) throw error;
  const row = (data ?? {}) as ProfileCustomizationPayload;
  return {
    userId: row.user_id ?? id,
    statusPhrase: row.status_phrase ?? '',
    beerTastes: row.beer_tastes ?? [],
    availability: row.availability ?? [],
    photoVisibility: row.photo_visibility ?? 'tutti',
    photos: (row.photos ?? []).map((p) => ({ id: p.id, url: p.url, storagePath: p.storage_path, position: p.position })),
    // scale e rotation arrivano da colonne numeriche: se il driver li consegna
    // come stringhe, "1" + 0.1 diventa concatenazione e i pulsanti di
    // ingrandimento smettono di funzionare senza dire niente. Forzarli a numero
    // qui li rende affidabili ovunque.
    stickers: (row.stickers ?? []).map((s) => ({
      key: s.key,
      title: s.title,
      assetKey: s.asset_key,
      description: s.description ?? '',
      unlocked: Boolean(s.unlocked),
      unlockHint: s.unlock_hint,
      slot: s.slot == null ? undefined : Number(s.slot),
      scale: s.scale == null ? undefined : Number(s.scale),
      rotation: s.rotation == null ? undefined : Number(s.rotation),
    })),
  };
}

export async function saveProfileCustomization(input: Pick<ProfileCustomization, 'statusPhrase' | 'beerTastes' | 'availability' | 'photoVisibility'>, stickers: ProfileSticker[]): Promise<void> {
  const { error } = await supabase.rpc('set_profile_customization', {
    p_status_phrase: input.statusPhrase.trim(), p_beer_tastes: input.beerTastes,
    p_availability: input.availability, p_photo_visibility: input.photoVisibility,
    p_stickers: stickers.filter((s) => s.unlocked && s.slot != null).map((s) => ({ key: s.key, slot: s.slot, scale: s.scale ?? 1, rotation: s.rotation ?? 0 })),
  });
  if (error) throw error;
}

export async function deleteProfilePhoto(photoId: string, storagePath: string): Promise<void> {
  const id = await requireUserId();
  const { error } = await supabase.from('profile_photos').delete().eq('id', photoId).eq('user_id', id);
  if (error) throw error;
  await supabase.storage.from('avatars').remove([storagePath]);
}

export async function arriveOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('arrive_order', { p_order_id: orderId });
  if (error) throw error;
}

export async function verifyDeliveryCode(orderId: string, code: string): Promise<void> {
  const { error } = await supabase.rpc('verify_delivery_code', { p_order_id: orderId, p_code: code.trim() });
  if (error) throw error;
}

export type NearbyConfirmationResult = { status: 'waiting' | 'completed' | 'code_required' | 'too_far'; distanceM?: number };
export async function updateOrderPresence(orderId: string, coords: Coords): Promise<void> {
  const { error } = await supabase.rpc('update_order_presence', { p_order_id: orderId, p_lat: coords.lat, p_lng: coords.lng, p_accuracy_m: coords.accuracy ?? null });
  if (error) throw error;
}
export async function confirmExchangeNearby(orderId: string, coords: Coords): Promise<NearbyConfirmationResult> {
  const { data, error } = await supabase.rpc('confirm_exchange_nearby', { p_order_id: orderId, p_lat: coords.lat, p_lng: coords.lng, p_accuracy_m: coords.accuracy ?? null });
  if (error) throw error;
  const value = data as { status: NearbyConfirmationResult['status']; distance_m?: number };
  return { status: value.status, distanceM: value.distance_m };
}
export async function releaseAcceptedOrder(orderId: string): Promise<void> { const { error } = await supabase.rpc('release_accepted_order', { p_order_id: orderId }); if (error) throw error; }
export async function cancelActiveOrder(orderId: string, reason: string, details = ''): Promise<void> { const { error } = await supabase.rpc('cancel_active_order', { p_order_id: orderId, p_reason: reason, p_details: details }); if (error) throw error; }

export async function getDeliveryCode(orderId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('order_delivery_codes')
    .select('code')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) throw error;
  return (data as { code: string } | null)?.code ?? null;
}

export async function getDeliveryCodeState(orderId: string): Promise<DeliveryCodeState | null> {
  const { data, error } = await supabase.from('order_delivery_codes')
    .select('code,failed_attempts,verified_at,expires_at').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { code: data.code, failedAttempts: data.failed_attempts, attemptsRemaining: Math.max(0, 5 - data.failed_attempts), verifiedAt: data.verified_at ?? undefined, expiresAt: data.expires_at ?? undefined };
}

export async function setOrderEta(orderId: string, minutes: number): Promise<void> {
  const { error } = await supabase.rpc('set_order_eta', { p_order_id: orderId, p_minutes: minutes });
  if (error) throw error;
}

export async function getOrderEta(orderId: string): Promise<number | null> {
  const { data, error } = await supabase.from('orders').select('eta_minutes').eq('id', orderId).maybeSingle();
  if (error) throw error;
  return data?.eta_minutes ?? null;
}

/**
 * Segnala un problema durante un giro.
 *
 * Prima chiamava `report_order_issue`, che scriveva su order_issues e
 * order_safety_events - due tabelle che NESSUNA schermata leggeva. Chi premeva
 * «non mi sento al sicuro» non veniva ascoltato da nessuno.
 *
 * Ora apre una segnalazione vera: avvisa gli amministratori, avvisa la persona
 * segnalata (senza dirle chi l'ha segnalata), e per «unsafe» ferma il giro.
 * Restituisce l'id della segnalazione, oppure null per gli imprevisti che sono
 * solo comunicazioni fra le due persone (ritardo, non riesco a partire).
 */
export async function reportOrderIssue(
  orderId: string,
  type: OrderIssueType,
  details = '',
): Promise<string | null> {
  const { data, error } = await supabase.rpc('segnala_problema_giro', {
    p_order_id: orderId,
    p_tipo: type,
    p_dettagli: details,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/**
 * Crea (o riusa) il link pubblico del giro e restituisce l'indirizzo completo.
 *
 * Sostituisce il vecchio `beertobeer://request/<id>`, che apriva l'app e solo
 * a chi partecipava a quel giro: un genitore senza app vedeva un link morto.
 * Questo si apre da qualsiasi telefono, scade da solo dopo dodici ore, e non
 * contiene mai l'indirizzo di casa.
 *
 * Se un link valido esiste gia' viene restituito lo stesso: quello mandato
 * prima a un amico deve continuare ad aggiornarsi.
 */
export async function creaLinkGiro(orderId: string): Promise<string> {
  const { data, error } = await supabase.rpc('crea_link_giro', { p_order_id: orderId });
  if (error) throw error;
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Configurazione mancante: non posso creare il link.');
  return `${base}/functions/v1/giro-pubblico?t=${data as string}`;
}

/** Spegne i link che ho creato per questo giro. */
export async function revocaLinkGiro(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('revoca_link_giro', { p_order_id: orderId });
  if (error) throw error;
}

/** Le segnalazioni ricevute da me, con la mia versione dei fatti se l'ho scritta. */
export type MiaSegnalazione = {
  id: string;
  motivoCodice: string | null;
  gravita: 'bassa' | 'media' | 'alta';
  stato: 'aperta' | 'in_esame' | 'chiusa';
  creataIl: string;
  giaRisposto: boolean;
  miaDichiarazione: string | null;
};

export async function getMieSegnalazioni(): Promise<MiaSegnalazione[]> {
  const { data, error } = await supabase.rpc('mie_segnalazioni');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    motivoCodice: (r.motivo_codice as string) ?? null,
    gravita: r.gravita as 'bassa' | 'media' | 'alta',
    stato: r.stato as 'aperta' | 'in_esame' | 'chiusa',
    creataIl: r.creata_il as string,
    giaRisposto: Boolean(r.gia_risposto),
    miaDichiarazione: (r.mia_dichiarazione as string) ?? null,
  }));
}

/** La versione dei fatti di chi e' stato segnalato. Finisce nello stesso fascicolo. */
export async function rispondiASegnalazione(reportId: string, testo: string): Promise<void> {
  const { error } = await supabase.rpc('rispondi_a_segnalazione', {
    p_report_id: reportId,
    p_testo: testo,
  });
  if (error) throw error;
}

export async function regenerateDeliveryCode(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('regenerate_delivery_code', { p_order_id: orderId });
  if (error) throw error;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase.from('notification_inbox').select('id,category,title,body,url,read_at,created_at').order('created_at', { ascending: false }).limit(80);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, category: row.category, title: row.title, body: row.body, url: row.url ?? undefined, readAt: row.read_at ?? undefined, createdAt: row.created_at }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notification_inbox').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function getOrderSafetyEvents(orderId: string): Promise<OrderSafetyEvent[]> {
  const { data, error } = await supabase
    .from('order_safety_events')
    .select('id, order_id, actor_id, event_type, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    actorId: row.actor_id ?? undefined,
    eventType: row.event_type,
    createdAt: row.created_at,
  })) as OrderSafetyEvent[];
}

/**
 * TOLTA: il contatto fidato.
 *
 * Scriveva davvero su order_trusted_contacts - ma nessuno leggeva quella
 * tabella, quindi il nome e il numero di una persona cara restavano li' senza
 * servire a niente. Un campo che promette protezione e non la da e' peggio di
 * un campo che non c'e': fa credere di essere piu' al sicuro.
 *
 * Al suo posto c'e' `creaLinkGiro`, che una persona fidata puo' davvero
 * aprire, anche senza l'app.
 */

export async function getReciprocitySummary(): Promise<ReciprocitySummary> {
  const { data, error } = await supabase.rpc('get_reciprocity_summary');
  if (error) throw error;
  const row = (data as { given_count: number; received_count: number }[] | null)?.[0];
  return { given: Number(row?.given_count ?? 0), received: Number(row?.received_count ?? 0) };
}

function currentWeekStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  now.setUTCDate(now.getUTCDate() - day);
  return now.toISOString().slice(0, 10);
}

export async function getUrbanMissions(): Promise<UrbanMission[]> {
  const id = await requireUserId();
  const week = currentWeekStart();
  const [catalog, progress] = await Promise.all([
    supabase.from('urban_missions').select('key,title,description,target,reward_beercoin').eq('active', true).limit(3),
    supabase.from('user_urban_missions').select('mission_key,progress,claimed_at').eq('user_id', id).eq('week_start', week),
  ]);
  if (catalog.error) throw catalog.error;
  if (progress.error) throw progress.error;
  const byKey = new Map((progress.data ?? []).map((row) => [row.mission_key, row]));
  return (catalog.data ?? []).map((row) => {
    const state = byKey.get(row.key);
    const value = Number(state?.progress ?? 0);
    return {
      key: row.key,
      title: row.title,
      description: row.description,
      target: row.target,
      rewardBeerCoin: row.reward_beercoin,
      progress: value,
      completed: value >= row.target,
      claimed: Boolean(state?.claimed_at),
    };
  });
}

export async function claimUrbanMission(key: string): Promise<void> {
  const { error } = await supabase.rpc('claim_urban_mission', { p_mission_key: key });
  if (error) throw error;
}

export async function getCityGoal(city: string): Promise<CityGoal> {
  const week = currentWeekStart();
  const { data, error } = await supabase.from('city_weekly_goals').select('citta,week_start,target,progress').eq('citta', city).eq('week_start', week).maybeSingle();
  if (error) throw error;
  return { city, weekStart: week, target: Number(data?.target ?? 20), progress: Number(data?.progress ?? 0) };
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

/** Saldo crediti dell'utente corrente (lordo: include quelli già impegnati). */
export async function getCreditBalance(): Promise<number> {
  const id = await requireUserId();
  const { data, error } = await supabase.from('users').select('crediti_saldo').eq('id', id).single();
  if (error) throw error;
  return (data as { crediti_saldo: number }).crediti_saldo;
}

/**
 * BeerCoin realmente spendibili ORA: saldo meno quelli già promessi a giri
 * aperti o in corso. È il numero su cui il database decide se una nuova
 * richiesta può partire, quindi è quello da mostrare a chi la sta creando.
 */
export async function getAvailableCredits(): Promise<number> {
  const id = await requireUserId();
  const { data, error } = await supabase.rpc('available_credits', { p_user: id });
  if (error) throw error;
  return Number(data ?? 0);
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
      descrizione: describeTransaction(t.tipo, incoming, otherName),
      importo: t.importo,
      tipo: incoming ? 'entrata' : 'uscita',
      kind: t.tipo as CreditTransaction['kind'],
      data: t.created_at,
    };
  });
}

/** Etichetta leggibile per un movimento in base al `tipo` del ledger. */
function describeTransaction(tipo: string, incoming: boolean, otherName: string): string {
  switch (tipo) {
    case 'welcome':
      return 'Benvenuto in BeerToBeer';
    case 'badge':
      return 'Traguardo V1';
    case 'livello':
      return 'Nuovo livello ⬆️';
    case 'missione':
      return 'Missione completata';
    case 'notturno':
      return 'Bonus giro notturno';
    case 'referral':
      return 'Invito amico';
    case 'zona':
      return 'Contributo al quartiere';
    case 'admin':
      return 'Rettifica staff';
    case 'consegna':
    default:
      return incoming ? `Giro consegnato a ${otherName}` : `Giro ricevuto da ${otherName}`;
  }
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

export async function submitReview(orderId: string, voto: number, commento: string, dimensions?: { puntualita: number; comunicazione: number; rispetto: number }): Promise<void> {
  const { error } = await supabase.rpc(dimensions ? 'submit_review_v21' : 'submit_review', {
    p_order_id: orderId,
    p_voto: voto,
    p_commento: commento.trim() || null,
    ...(dimensions ? { p_puntualita: dimensions.puntualita, p_comunicazione: dimensions.comunicazione, p_rispetto: dimensions.rispetto } : {}),
  });
  if (error) throw error;
}

/**
 * Gli id dei giri che ho già recensito.
 *
 * Serve all'elenco dei giri per proporre "lascia una recensione" finché ha
 * senso e non oltre. Senza questo dato la schermata non sapeva distinguere un
 * giro da recensire da uno già recensito, e per non riempire l'elenco di inviti
 * eterni l'invito non veniva mostrato affatto: la recensione, che è l'ultimo
 * passo dello scambio, spariva dal percorso.
 */
export async function getReviewedOrderIds(): Promise<string[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase.from('reviews').select('order_id').eq('from_user_id', myId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => (r as { order_id: string | null }).order_id)
    .filter((x): x is string => !!x);
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

/**
 * Segnala una persona. Passa da una RPC e non piu' da un insert diretto,
 * perche' oltre a scrivere la riga deve avvisare gli amministratori e la
 * persona segnalata: prima la segnalazione finiva in una tabella e nessuno
 * riceveva niente.
 */
export async function reportUser(userId: string, reason: ReportReason, details: string, orderId?: string): Promise<void> {
  const { error } = await supabase.rpc('segnala_utente', {
    p_user_id: userId,
    p_motivo: reason,
    p_dettagli: details,
    p_order_id: orderId ?? null,
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

/**
 * Invia un messaggio e restituisce la riga creata, così chi scrive può vederla
 * comparire SUBITO. Prima non tornava nulla e il messaggio appariva solo quando
 * rimbalzava indietro dal tempo reale: se quello era lento o giù, si scriveva,
 * il campo si svuotava e non si vedeva niente.
 */
export async function sendMessage(orderId: string, testo: string): Promise<Message | null> {
  const senderId = await requireUserId();
  const clean = testo.trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: senderId, testo: clean })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw error;
  return mapMessage(data as MessageRow);
}

export function subscribeToMessages(orderId: string, onMessage: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${orderId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      async (payload) => {
        const row = payload.new as MessageRow;
        // Il payload del tempo reale porta solo la riga: senza il profilo di chi
        // scrive, la bolla in arrivo resta con avatar anonimo e nome "Utente"
        // finché non si riapre la chat.
        const profiles = await fetchProfiles([row.sender_id]).catch(() => new Map<string, User>());
        onMessage(mapMessage(row, profiles.get(row.sender_id)));
      },
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
  /** Il fascicolo: le due versioni dei fatti, la gravita, lo stato, il contesto. */
  motivoCodice: string | null;
  gravita: 'bassa' | 'media' | 'alta';
  stato: 'aperta' | 'in_esame' | 'chiusa';
  dichiarazioneSegnalante: string | null;
  dichiarazioneSegnalato: string | null;
  rispostoIl: string | null;
  noteAdmin: string | null;
  chiusaIl: string | null;
  /** Fotografia del giro al momento della segnalazione (resta anche se il giro sparisce). */
  contesto: Record<string, unknown> | null;
};

export async function getAdminReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, reported_user_id, reporting_user_id, order_id, motivo, created_at, ' +
        'motivo_codice, gravita, stato, dichiarazione_segnalante, dichiarazione_segnalato, ' +
        'risposto_il, note_admin, chiusa_il, contesto',
    )
    // Prima le aperte, e fra quelle prima le gravi: chi non si sente al sicuro
    // non deve finire in fondo a un elenco ordinato per data.
    .order('stato', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  type RigaFascicolo = {
    id: string;
    reported_user_id: string;
    reporting_user_id: string;
    order_id: string | null;
    motivo: string;
    created_at: string;
    motivo_codice: string | null;
    gravita: 'bassa' | 'media' | 'alta' | null;
    stato: 'aperta' | 'in_esame' | 'chiusa' | null;
    dichiarazione_segnalante: string | null;
    dichiarazione_segnalato: string | null;
    risposto_il: string | null;
    note_admin: string | null;
    chiusa_il: string | null;
    contesto: Record<string, unknown> | null;
  };
  const rows = (data ?? []) as unknown as RigaFascicolo[];
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
    motivoCodice: r.motivo_codice,
    gravita: r.gravita ?? 'media',
    stato: r.stato ?? 'aperta',
    dichiarazioneSegnalante: r.dichiarazione_segnalante,
    dichiarazioneSegnalato: r.dichiarazione_segnalato,
    rispostoIl: r.risposto_il,
    noteAdmin: r.note_admin,
    chiusaIl: r.chiusa_il,
    contesto: r.contesto,
  }));
}

/**
 * Le segnalazioni NON si cancellano piu': si chiudono.
 *
 * Prima il pannello faceva `delete`, quindi di una persona segnalata tre volte
 * non restava traccia di nessuna delle tre - e la terza segnalazione deve
 * pesare piu' della prima.
 */
export async function adminChiudiSegnalazione(reportId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_chiudi_segnalazione', {
    p_report_id: reportId,
    p_note: note,
  });
  if (error) throw error;
}

export type TipoProvvedimento = 'avvertimento' | 'sospensione' | 'esclusione';

/**
 * Applica un provvedimento e chiude il fascicolo. Prima esisteva una pena
 * sola: 48 ore, scritte a mano nella schermata.
 */
export async function adminProvvedimento(input: {
  reportId?: string | null;
  userId: string;
  tipo: TipoProvvedimento;
  giorni?: number;
  motivo: string;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_provvedimento', {
    p_report_id: input.reportId ?? null,
    p_user_id: input.userId,
    p_tipo: input.tipo,
    p_giorni: input.giorni ?? null,
    p_motivo: input.motivo,
  });
  if (error) throw error;
}

/** Rimette in moto un giro fermato da una segnalazione, dopo aver verificato. */
export async function adminScongelaGiro(orderId: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('admin_scongela_giro', {
    p_order_id: orderId,
    p_motivo: motivo,
  });
  if (error) throw error;
}

// ---------- Città utente (per il fan-out delle push "nuova richiesta") ----------

/** Sincronizza sul server la città selezionata nell'app. Best-effort. */
export async function updateUserCity(citta: string): Promise<void> {
  const id = await requireUserId();
  const { error } = await supabase.from('users').update({ citta }).eq('id', id);
  if (error) throw error;
}

// ---------- Negozi ("bangladini") mappati dalla community ----------

export type Shop = {
  id: string;
  nome: string;
  citta: string;
  lat: number;
  lng: number;
  createdBy: string | null;
  /** 'in_attesa' (visibile solo al creatore e agli admin) | 'approvato' | 'rimosso' */
  stato: string;
  /** orari stimati segnalati dagli utenti (testo libero) */
  orari: string | null;
};

type ShopRow = {
  id: string;
  nome: string;
  citta: string;
  lat: number;
  lng: number;
  created_by: string | null;
  stato: string;
  orari: string | null;
};

const SHOP_COLUMNS = 'id, nome, citta, lat, lng, created_by, stato, orari';

function mapShop(r: ShopRow): Shop {
  return {
    id: r.id,
    nome: r.nome,
    citta: r.citta,
    lat: r.lat,
    lng: r.lng,
    createdBy: r.created_by,
    stato: r.stato,
    orari: r.orari,
  };
}

/** Negozi visibili nella città (la RLS mostra: approvati + i propri in attesa; admin tutto). */
export async function getShops(citta: string): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select(SHOP_COLUMNS)
    .eq('citta', citta)
    .neq('stato', 'rimosso');
  if (error) throw error;
  return ((data ?? []) as ShopRow[]).map(mapShop);
}

export async function addShop(input: {
  nome: string;
  citta: string;
  lat: number;
  lng: number;
  orari?: string;
}): Promise<void> {
  const id = await requireUserId();
  const { error } = await supabase.from('shops').insert({
    nome: input.nome.trim(),
    citta: input.citta,
    lat: input.lat,
    lng: input.lng,
    orari: input.orari?.trim() || null,
    created_by: id,
  });
  if (error) throw error;
}

export async function deleteShop(shopId: string): Promise<void> {
  const { error } = await supabase.from('shops').delete().eq('id', shopId);
  if (error) throw error;
}

// ---------- Connessioni + chat diretta ----------

export type Connection = {
  user: User;
  /** numero di scambi confermati insieme */
  scambi: number;
  /** data dell'ultimo scambio confermato (ISO) */
  ultimoScambio: string;
};

/** Le persone con cui ho completato almeno uno scambio confermato. */
export async function getConnections(): Promise<Connection[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('orders')
    .select('host_id, driver_id, updated_at')
    .eq('stato', 'confermato')
    .or(`host_id.eq.${myId},driver_id.eq.${myId}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as { host_id: string; driver_id: string | null; updated_at: string }[];
  const byUser = new Map<string, { scambi: number; ultimoScambio: string }>();
  for (const r of rows) {
    const other = r.host_id === myId ? r.driver_id : r.host_id;
    if (!other) continue;
    const entry = byUser.get(other);
    if (entry) entry.scambi += 1;
    else byUser.set(other, { scambi: 1, ultimoScambio: r.updated_at });
  }

  const profiles = await fetchProfiles([...byUser.keys()]);
  return [...byUser.entries()]
    .map(([id, info]) => ({ user: profiles.get(id) ?? { ...UNKNOWN_USER, id }, ...info }))
    .filter((c) => c.user.id !== '');
}

type DirectMessageRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  testo: string;
  created_at: string;
};

function mapDirectMessage(row: DirectMessageRow, sender?: User): Message {
  return {
    id: row.id,
    orderId: '',
    senderId: row.from_user_id,
    testo: row.testo,
    createdAt: row.created_at,
    sender,
  };
}

export async function getDirectMessages(otherUserId: string): Promise<Message[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('direct_messages')
    .select('id, from_user_id, to_user_id, testo, created_at')
    .or(
      `and(from_user_id.eq.${myId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${myId})`,
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as DirectMessageRow[];
  const senders = await fetchProfiles(rows.map((r) => r.from_user_id));
  return rows.map((r) => mapDirectMessage(r, senders.get(r.from_user_id)));
}

/** Invia un messaggio diretto e ritorna la riga creata (per l'append locale). */
export async function sendDirectMessage(otherUserId: string, testo: string): Promise<Message | null> {
  const myId = await requireUserId();
  const clean = testo.trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ from_user_id: myId, to_user_id: otherUserId, testo: clean })
    .select('id, from_user_id, to_user_id, testo, created_at')
    .single();
  if (error) throw error;
  return mapDirectMessage(data as DirectMessageRow);
}

/**
 * Messaggi diretti in arrivo dall'altro utente, in tempo reale.
 * NB: il filtro realtime supporta UNA sola colonna → ci si iscrive ai messaggi
 * indirizzati a me e si filtra il mittente lato client; i propri invii vanno
 * appesi localmente dal chiamante.
 */
export function subscribeToDirectMessages(myId: string, otherUserId: string, onMessage: (message: Message) => void) {
  const channel = supabase
    .channel(`direct:${otherUserId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `to_user_id=eq.${myId}` },
      (payload) => {
        const row = payload.new as DirectMessageRow;
        if (row.from_user_id === otherUserId) onMessage(mapDirectMessage(row));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// GAMIFICATION & COMMUNITY
// ============================================================

// ---------- Onboarding ----------

/** true se l'utente ha già completato l'onboarding (colonna users.onboarding_completed). */
export async function getOnboardingCompleted(): Promise<boolean> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', id)
    .single();
  if (error) throw error;
  return !!(data as { onboarding_completed: boolean }).onboarding_completed;
}

/** Segna l'onboarding come completato (RPC SECURITY DEFINER). */
export async function completeOnboarding(): Promise<void> {
  const { error } = await supabase.rpc('complete_onboarding');
  if (error) throw error;
}

// ---------- Badge ----------

/** Badge sbloccati da un utente (chiave + data), via RPC badges_for_user. */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase.rpc('badges_for_user', { p_user: userId });
  if (error) throw error;
  return ((data ?? []) as { badge_key: string; unlocked_at: string }[]).map((r) => ({
    key: r.badge_key,
    unlockedAt: r.unlocked_at,
  }));
}

// ---------- Referral ----------

/**
 * Manda una notifica di prova a sé stessi. È l'unico modo per verificare
 * l'intera catena (permesso del telefono, token salvato, funzione push, Expo)
 * invece di scoprire che non arriva niente quando serviva davvero.
 */
export async function sendTestPush(): Promise<void> {
  const { error } = await supabase.rpc('send_test_push');
  if (error) throw error;
}

/**
 * I miei inviti. In Beer to Beer si entra solo su invito e ognuno ne ha uno
 * solo: la lista è corta di proposito.
 */
export async function getMyInvites(): Promise<Invite[]> {
  const { data, error } = await supabase.rpc('my_invites');
  if (error) throw error;
  return ((data ?? []) as { code: string; usato: boolean; invitato: string | null; used_at: string | null }[]).map((r) => ({
    code: r.code,
    usato: r.usato,
    invitato: r.invitato ?? undefined,
    usedAt: r.used_at ?? undefined,
  }));
}

/**
 * Il codice esiste ed è ancora libero? Serve alla registrazione per dirlo
 * subito, invece di far compilare tutto e fallire alla fine.
 */
export async function checkInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('invite_is_valid', { p_code: code.trim() });
  if (error) return false;
  return Boolean(data);
}

/** @deprecated Gli inviti si registrano all'ingresso: questa non fa più nulla. */
export async function applyReferral(inviterId: string): Promise<void> {
  const { error } = await supabase.rpc('apply_referral', { p_inviter: inviterId });
  if (error) throw error;
}

// ---------- Leaderboard ----------

/** Classifica dei più attivi in una città (per consegne). Vista leaderboard_citta. */
export async function getLeaderboard(citta: string, limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_citta')
    .select('id, nome, foto_url, consegne, livello')
    .eq('citta', citta)
    .order('consegne', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as {
    id: string;
    nome: string;
    foto_url: string | null;
    consegne: number;
    livello: number;
  }[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    fotoUrl: r.foto_url ?? undefined,
    consegne: r.consegne,
    livello: r.livello,
  }));
}

// ---------- Zone (conquista quartieri) ----------

/** Zone conquistate in una città, con il rispettivo holder. */
export async function getZoneHolders(citta: string): Promise<ZoneHolder[]> {
  const { data, error } = await supabase
    .from('zone_holders')
    .select('citta, zona, holder_user_id, punteggio')
    .eq('citta', citta)
    .order('punteggio', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as {
    citta: string;
    zona: string;
    holder_user_id: string | null;
    punteggio: number;
  }[]).map((r) => ({
    citta: r.citta,
    zona: r.zona,
    holderUserId: r.holder_user_id,
    punteggio: r.punteggio,
  }));
}

// ---------- Complimenti ----------

/** I complimenti ricevuti da un utente, aggregati per tipo (RPC compliments_for_user). */
export async function getCompliments(userId: string): Promise<ComplimentCount[]> {
  const { data, error } = await supabase.rpc('compliments_for_user', { p_user: userId });
  if (error) throw error;
  return ((data ?? []) as { tipo: string; n: number }[]).map((r) => ({ tipo: r.tipo, n: r.n }));
}

/** Lascia un complimento alla controparte di un ordine confermato. */
export async function sendCompliment(orderId: string, toUserId: string, tipo: string): Promise<void> {
  const myId = await requireUserId();
  const { error } = await supabase
    .from('compliments')
    .insert({ order_id: orderId, from_user_id: myId, to_user_id: toUserId, tipo });
  if (error) throw error;
}

// ---------- Eventi (giri di birra di gruppo) ----------

type EventRow = {
  id: string;
  host_id: string;
  citta: string | null;
  titolo: string;
  descrizione: string | null;
  quando: string;
  luogo: string | null;
  lat: number | null;
  lng: number | null;
  posti: number;
  stato: 'aperto' | 'chiuso' | 'annullato';
  created_at: string;
};

function mapEvent(row: EventRow, host?: User): BeerEvent {
  return {
    id: row.id,
    hostId: row.host_id,
    host,
    citta: row.citta,
    titolo: row.titolo,
    descrizione: row.descrizione,
    quando: row.quando,
    luogo: row.luogo,
    lat: row.lat,
    lng: row.lng,
    posti: row.posti,
    stato: row.stato,
    createdAt: row.created_at,
  };
}

/** Eventi aperti (futuri) in una città, con host e conteggio partecipanti. */
export async function getEvents(citta: string): Promise<BeerEvent[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('events')
    .select('id, host_id, citta, titolo, descrizione, quando, luogo, lat, lng, posti, stato, created_at')
    .eq('citta', citta)
    .eq('stato', 'aperto')
    // La soglia è la STESSA che usa join_event_v21 per decidere se ci si può
    // ancora unire. Quando le due divergevano, l'incontro restava in elenco e
    // il database rifiutava di farci entrare.
    .gte('quando', sogliaIncontriVisibili().toISOString())
    .order('quando', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as EventRow[];
  const hosts = await fetchProfiles(rows.map((r) => r.host_id));

  // Partecipanti (conteggio) + se partecipo io.
  const ids = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  if (ids.length > 0) {
    const { data: parts } = await supabase
      .from('event_participants')
      .select('event_id, user_id')
      .in('event_id', ids);
    for (const p of (parts ?? []) as { event_id: string; user_id: string }[]) {
      counts.set(p.event_id, (counts.get(p.event_id) ?? 0) + 1);
      if (p.user_id === myId) mine.add(p.event_id);
    }
  }

  return rows.map((r) => ({
    ...mapEvent(r, hosts.get(r.host_id)),
    partecipanti: counts.get(r.id) ?? 0,
    partecipo: mine.has(r.id),
  }));
}

/** Dettaglio di un singolo evento. */
export async function getEventById(id: string): Promise<BeerEvent | null> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('events')
    .select('id, host_id, citta, titolo, descrizione, quando, luogo, lat, lng, posti, stato, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as EventRow;
  const hosts = await fetchProfiles([row.host_id]);
  const { data: parts } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', id);
  const partList = (parts ?? []) as { user_id: string }[];
  return {
    ...mapEvent(row, hosts.get(row.host_id)),
    partecipanti: partList.length,
    partecipo: partList.some((p) => p.user_id === myId),
  };
}

export type CreateEventInput = {
  titolo: string;
  descrizione?: string;
  quando: string;
  luogo?: string;
  citta: string;
  lat?: number | null;
  lng?: number | null;
  posti?: number;
};

/** Crea un nuovo evento (l'utente corrente è l'host). Ritorna l'id creato. */
export async function createEvent(input: CreateEventInput): Promise<string> {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from('events')
    .insert({
      host_id: id,
      titolo: input.titolo.trim(),
      descrizione: input.descrizione?.trim() || null,
      quando: input.quando,
      luogo: input.luogo?.trim() || null,
      citta: input.citta,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      posti: input.posti ?? 6,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Partecipa a un evento. */
export async function joinEvent(eventId: string): Promise<'host' | 'joined' | 'waitlisted'> {
  const { data, error } = await supabase.rpc('join_event_v21', { p_event_id: eventId });
  if (error) throw error;
  return data as 'host' | 'joined' | 'waitlisted';
}

export async function cancelStaleOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_stale_order', { p_order_id: orderId });
  if (error) throw error;
}

export async function submitProductFeedback(kind: 'bug' | 'idea', message: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('product_feedback').insert({ user_id: userId, kind, message: message.trim(), app_version: 'V2.1' });
  if (error) throw error;
}

export async function adminGetProductFeedback(): Promise<ProductFeedback[]> {
  const { data, error } = await supabase.rpc('admin_product_feedback');
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: row.id as string, userId: row.user_id as string, kind: row.kind as 'bug'|'idea', message: row.message as string, appVersion: row.app_version as string|undefined, createdAt: row.created_at as string, userName: row.user_name as string|undefined }));
}

export async function adminCancelOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_cancel_order', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
}

export type AdminActiveOrder = { id:string; hostId:string; hostName:string; driverId?:string; driverName?:string; driverPhoto?:string; lat:number; lng:number; driverLat?:number; driverLng?:number; lastSeen?:string; state:string; updatedAt:string };
export async function adminGetActiveOrders(): Promise<AdminActiveOrder[]> { const {data,error}=await supabase.rpc('admin_active_orders');if(error)throw error;return (data??[]).map((r:Record<string,unknown>)=>({id:r.id as string,hostId:r.host_id as string,hostName:r.host_name as string,driverId:r.driver_id as string|undefined,driverName:r.driver_name as string|undefined,driverPhoto:r.driver_photo as string|undefined,lat:Number(r.lat),lng:Number(r.lng),driverLat:r.driver_lat==null?undefined:Number(r.driver_lat),driverLng:r.driver_lng==null?undefined:Number(r.driver_lng),lastSeen:r.last_seen as string|undefined,state:r.stato as string,updatedAt:r.updated_at as string})) }

/** Abbandona un evento. */
export async function leaveEvent(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_event_v21', { p_event_id: eventId });
  if (error) throw error;
}

// ---------- Bacheca community ----------

/** Attività recente della community di una città (vista community_feed). */
export async function getCommunityFeed(citta: string, limit = 40): Promise<CommunityFeedItem[]> {
  const { data, error } = await supabase
    .from('community_feed')
    .select('data, tipo, user_id, user_nome, citta, titolo, emoji')
    .eq('citta', citta)
    .order('data', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as {
    data: string;
    tipo: CommunityFeedItem['tipo'];
    user_id: string;
    user_nome: string;
    citta: string | null;
    titolo: string;
    emoji: string;
  }[]).map((r) => ({
    data: r.data,
    tipo: r.tipo,
    userId: r.user_id,
    userNome: r.user_nome,
    citta: r.citta,
    titolo: r.titolo,
    emoji: r.emoji,
  }));
}

// ---------- Discovery persone (per affinità/prossimità) ----------

/** Profili pubblici di una città (per la scoperta di gente nuova nella tab Community). */
export async function getPeopleInCity(citta: string, limit = 30): Promise<User[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('public_profiles')
    .select(PROFILE_COLUMNS)
    .eq('citta', citta)
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as PublicProfileRow[])
    .map(mapPublicProfile)
    .filter((u) => u.id !== myId);
}

// ---------- Amministrazione (RPC SECURITY DEFINER, gate is_admin lato server) ----------

export type AdminUser = {
  id: string;
  nome: string;
  email: string;
  citta: string | null;
  creditiSaldo: number;
  ratingMedio: number;
  isAdmin: boolean;
  sospesoFino: string | null;
  createdAt: string;
  nRichieste: number;
  nConsegne: number;
};

export async function adminListUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    nome: string;
    email: string;
    citta: string | null;
    crediti_saldo: number;
    rating_medio: number;
    is_admin: boolean;
    sospeso_fino: string | null;
    created_at: string;
    n_richieste: number;
    n_consegne: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    citta: r.citta,
    creditiSaldo: r.crediti_saldo,
    ratingMedio: Number(r.rating_medio),
    isAdmin: r.is_admin,
    sospesoFino: r.sospeso_fino,
    createdAt: r.created_at,
    nRichieste: Number(r.n_richieste),
    nConsegne: Number(r.n_consegne),
  }));
}

export async function adminSuspendUser(userId: string, until: string | null): Promise<void> {
  const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: userId, p_until: until });
  if (error) throw error;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
}

export async function adminSetOrderModeration(orderId: string, stato: 'ok' | 'rimosso'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_order_moderation', { p_order_id: orderId, p_stato: stato });
  if (error) throw error;
}

/** Tutti i negozi (admin: la RLS mostra ogni stato), per il pannello moderazione. */
export async function adminListShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select(SHOP_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ShopRow[]).map(mapShop);
}

export async function adminSetShopStato(shopId: string, stato: 'approvato' | 'rimosso'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_shop_stato', { p_shop_id: shopId, p_stato: stato });
  if (error) throw error;
}

/** Rettifica manuale dei crediti (delta positivo o negativo), tracciata nel ledger. */
export async function adminAdjustCredits(userId: string, delta: number, motivo?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_adjust_credits', {
    p_user_id: userId,
    p_delta: delta,
    p_motivo: motivo ?? null,
  });
  if (error) throw error;
}

export type AdminStats = {
  utentiTotali: number;
  utentiSospesi: number;
  utentiPerCitta: Record<string, number>;
  creditiTotali: number;
  creditiPerCitta: Record<string, number>;
  richiesteAperte: number;
  ordiniInCorso: number;
  scambiCompletati: number;
  creditiScambiati7g: number;
  richiesteOscurate: number;
  negoziInAttesa: number;
  negoziApprovati: number;
  segnalazioniAperte: number;
};

export async function adminDashboardStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  if (error) throw error;
  const raw = data as Record<string, unknown>;
  return {
    utentiTotali: Number(raw.utenti_totali ?? 0),
    utentiSospesi: Number(raw.utenti_sospesi ?? 0),
    utentiPerCitta: (raw.utenti_per_citta ?? {}) as Record<string, number>,
    creditiTotali: Number(raw.crediti_totali ?? 0),
    creditiPerCitta: (raw.crediti_per_citta ?? {}) as Record<string, number>,
    richiesteAperte: Number(raw.richieste_aperte ?? 0),
    ordiniInCorso: Number(raw.ordini_in_corso ?? 0),
    scambiCompletati: Number(raw.scambi_completati ?? 0),
    creditiScambiati7g: Number(raw.crediti_scambiati_7g ?? 0),
    richiesteOscurate: Number(raw.richieste_oscurate ?? 0),
    negoziInAttesa: Number(raw.negozi_in_attesa ?? 0),
    negoziApprovati: Number(raw.negozi_approvati ?? 0),
    segnalazioniAperte: Number(raw.segnalazioni_aperte ?? 0),
  };
}
