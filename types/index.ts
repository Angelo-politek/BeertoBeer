/**
 * Tipi di dominio dell'app, modellati sullo schema dati del README.
 * In Fase 1 questi tipi rappresenteranno le righe delle tabelle Supabase.
 */

/** Una persona registrata (host o driver). Schema: tabella `users`. */
export type User = {
  id: string;
  nome: string;
  eta: number;
  bio: string;
  /** rating medio 0–5 calcolato dalle recensioni reciproche */
  ratingMedio: number;
  /** numero di scambi/consegne completati (per il profilo) */
  scambiCompletati: number;
  /** saldo crediti della piattaforma (non convertibile in denaro) */
  creditiSaldo: number;
  /** preferenze/gusti birra dichiarati (facoltativo) */
  preferenzeBirra?: string;
  /** URL pubblico della foto profilo (Supabase Storage), se impostata */
  fotoUrl?: string;
  /** true solo per i moderatori; valorizzato solo da getCurrentUser (campo privato) */
  isAdmin?: boolean;
  /** sospensione moderazione (ISO): finché è nel futuro non può creare richieste */
  sospesoFino?: string | null;
  /** città preferita salvata sul server (per le push); solo da getCurrentUser */
  citta?: string | null;
  /** livello Peroni (0-4) derivato dagli scambi confermati; vista public_profiles */
  livello?: number;
  /** karma: consegne − ordini confermati (positivo = contribuisce) */
  karma?: number;
  /** tag/interessi dichiarati (birre, hobby...) per la discovery per affinità */
  interessi?: string[];
  /** true se l'utente è aperto a conoscere gente nuova */
  cercoCompagnia?: boolean;
};

export type Review = {
  id: string;
  orderId: string;
  fromUserId: string;
  toUserId: string;
  voto: number;
  commento?: string;
  createdAt: string;
  author?: User;
};

export type ReportReason =
  | 'comportamento_scorretto'
  | 'ordine_falso'
  | 'molestie'
  | 'spam'
  | 'sicurezza'
  | 'altro';

export type BlockedUser = {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
  user?: User;
};

export type Message = {
  id: string;
  orderId: string;
  senderId: string;
  testo: string;
  createdAt: string;
  sender?: User;
};

/** Una voce della lista birre richiesta. Parte di `orders.lista_birre`. */
export type BeerItem = {
  nome: string;
  quantita: number;
  /** formato del contenitore (es. '33cl', '50cl', 'lattina33'): determina il peso */
  formato?: string;
};

/** Stato di un ordine nel suo ciclo di vita. Schema: `orders.stato`. */
export type OrderStatus =
  | 'richiesto'
  | 'accettato'
  | 'in_consegna'
  | 'consegnato'
  | 'confermato';

/**
 * Una richiesta di consegna birre. Schema: tabella `orders`.
 * Per la Fase 0 incorporiamo l'oggetto `host` completo (denormalizzato):
 * in Fase 1 sarà una join tra `orders.host_id` e `users`.
 */
export type BeerRequest = {
  id: string;
  host: User;
  /** id del driver che ha accettato (null finché l'ordine è 'richiesto') */
  driverId: string | null;
  birre: BeerItem[];
  /** indirizzo di consegna (visibile per intero solo dopo l'accettazione) */
  indirizzo: string;
  /** coordinate di consegna: esatte per i partecipanti, arrotondate (~area) nel feed */
  lat?: number | null;
  lng?: number | null;
  /** fascia oraria desiderata (testo libero, es. "Stasera") */
  fascia?: string;
  /** chiave della città (lib/cities.ts); null per ordini storici pre-città */
  citta?: string | null;
  /** moderazione: 'ok' | 'oscurato' (in verifica) | 'rimosso' */
  statoModerazione?: string;
  /** distanza dall'utente in km — opzionale finché non c'è la geolocalizzazione */
  distanzaKm?: number;
  stato: OrderStatus;
  /** se true, l'host invita il driver a fermarsi a bere insieme */
  vibeMode: boolean;
  creditiOfferti: number;
  /** conferme di chiusura scambio: a entrambe true i crediti si sbloccano */
  hostConfermato: boolean;
  driverConfermato: boolean;
  createdAt: string;
};

/** Direzione di un movimento crediti. */
export type TransactionType = 'entrata' | 'uscita';

/** Categoria del movimento (dal campo `tipo` del ledger), per icona/etichetta. */
export type TransactionKind =
  | 'consegna'
  | 'welcome'
  | 'badge'
  | 'livello'
  | 'missione'
  | 'notturno'
  | 'referral'
  | 'zona'
  | 'admin';

/** Un movimento nel ledger crediti. Schema: tabella `credit_transactions`. */
export type CreditTransaction = {
  id: string;
  descrizione: string;
  /** importo sempre positivo; la direzione è in `tipo` */
  importo: number;
  tipo: TransactionType;
  /** categoria d'origine (consegna, welcome, badge...) per la UI */
  kind?: TransactionKind;
  data: string;
};

// ---------- Gamification & social ----------

/** Un badge sbloccato da un utente. */
export type UserBadge = {
  key: string;
  unlockedAt: string;
};

/** Voce di classifica di città. Vista `leaderboard_citta`. */
export type LeaderboardEntry = {
  id: string;
  nome: string;
  fotoUrl?: string;
  consegne: number;
  livello: number;
};

/** Holder di una zona/quartiere. Tabella `zone_holders`. */
export type ZoneHolder = {
  citta: string;
  zona: string;
  holderUserId: string | null;
  punteggio: number;
};

/** Un "giro di birra" di gruppo. Tabella `events`. */
export type BeerEvent = {
  id: string;
  hostId: string;
  host?: User;
  citta?: string | null;
  titolo: string;
  descrizione?: string | null;
  quando: string;
  luogo?: string | null;
  lat?: number | null;
  lng?: number | null;
  posti: number;
  stato: 'aperto' | 'chiuso' | 'annullato';
  createdAt: string;
  /** numero di partecipanti (host escluso o incluso a seconda della query) */
  partecipanti?: number;
  /** true se l'utente corrente partecipa */
  partecipo?: boolean;
};

/** Conteggio complimenti ricevuti per tipo. */
export type ComplimentCount = {
  tipo: string;
  n: number;
};

/** Voce della bacheca community. Vista `community_feed`. */
export type CommunityFeedItem = {
  data: string;
  tipo: 'badge' | 'nuovo_utente' | 'evento';
  userId: string;
  userNome: string;
  citta?: string | null;
  titolo: string;
  emoji: string;
};
