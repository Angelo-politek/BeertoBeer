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
  /** campo storico V1, non mostrato nella V2 */
  livello?: number;
  /** karma: consegne − ordini confermati (positivo = contribuisce) */
  karma?: number;
  /** tag/interessi dichiarati (birre, hobby...) per la discovery per affinità */
  interessi?: string[];
  /** true se l'utente è aperto a conoscere gente nuova */
  cercoCompagnia?: boolean;
  /** frase breve mostrata nella vetrina del profilo */
  statusPhrase?: string;
};

export type ProfilePhotoVisibility = 'tutti' | 'connessioni' | 'nascoste';

export type ProfilePhoto = {
  id: string;
  url: string;
  storagePath: string;
  position: number;
};

export type ProfileSticker = {
  key: string;
  title: string;
  assetKey: string;
  description: string;
  unlocked: boolean;
  unlockHint?: string;
  slot?: number;
  scale?: number;
  rotation?: number;
};

export type ProfileCustomization = {
  userId: string;
  statusPhrase: string;
  beerTastes: string[];
  availability: string[];
  photoVisibility: ProfilePhotoVisibility;
  photos: ProfilePhoto[];
  stickers: ProfileSticker[];
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
  /** Voti di dettaglio (1-5), presenti dalle recensioni V2.1 in poi. */
  puntualita?: number;
  comunicazione?: number;
  rispetto?: number;
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
  | 'arrivato'
  | 'consegnato'
  | 'confermato'
  | 'annullato';

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
  /**
   * Profilo di chi porta, risolto insieme a quello di chi chiede.
   * Chi lancia un giro deve sapere chi sta per suonare al suo portone: era il
   * buco piu' grave dell'esperienza, e chiuderlo costa zero query in piu'.
   */
  driver?: User;
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
  /** fermato da una segnalazione di sicurezza: nessuna transizione e' permessa */
  congelato?: boolean;
  /** quando esce dal feed. La decide il server: orders.scade_il */
  scadeIl?: string;
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
  /** ultimo cambiamento: il server ci decide se un giro è bloccato da 24h */
  updatedAt?: string;
  etaMinutes?: number | null;
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
  | 'missione_urbana'
  | 'obiettivo_citta'
  | 'admin';

export type OrderSafetyEvent = {
  id: string;
  orderId: string;
  actorId?: string;
  eventType: 'accepted' | 'started' | 'arrived' | 'code_failed' | 'code_verified' | 'exited' | 'shared' | 'reported' | 'completed';
  createdAt: string;
};

export type DeliveryCodeState = { code?: string; failedAttempts: number; attemptsRemaining: number; verifiedAt?: string; expiresAt?: string };
export type OrderIssueType = 'cannot_start' | 'delay' | 'person_absent' | 'request_mismatch' | 'unsafe';
export type NotificationItem = { id: string; category: 'order' | 'chat' | 'event' | 'mission' | 'safety'; title: string; body: string; url?: string; readAt?: string; createdAt: string };
export type ProductFeedback = { id: string; userId: string; kind: 'bug' | 'idea'; message: string; appVersion?: string; createdAt: string; userName?: string };

export type UrbanMission = {
  key: string;
  title: string;
  description: string;
  target: number;
  rewardBeerCoin: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

export type CityGoal = { city: string; target: number; progress: number; weekStart: string };
export type ReciprocitySummary = { given: number; received: number };

/** Un invito: in Beer to Beer si entra solo così. */
export type Invite = {
  code: string;
  usato: boolean;
  /** nome di chi l'ha usato, se è stato speso */
  invitato?: string;
  usedAt?: string;
};

export type DiscoveryTime = 'all' | 'now' | 'tonight';
export type DiscoverySort = 'scadenza' | 'distanza' | 'recenti';
export type DiscoveryFilters = {
  vibeOnly: boolean;
  maxDistanceKm: number | null;
  time: DiscoveryTime;
  sort: DiscoverySort;
};

export type OrderNextAction = {
  key: 'accept' | 'start' | 'arrive' | 'verify' | 'confirm' | 'wait' | 'review' | 'open';
  label: string;
  priority: number;
};

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
  /**
   * «incontro» = spontaneo, lo crea chiunque, due birre al parco.
   * «evento» = in un locale, con locandina, aperto a piu' gente.
   * Gli incontri creati prima di questa distinzione restano «incontro».
   */
  tipo: 'incontro' | 'evento';
  locandinaUrl?: string | null;
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

/**
 * Un'uscita: una persona, un quartiere, un paio d'ore.
 * L'unita' centrale della V3. Schema: tabella `uscite`.
 */
export type Uscita = {
  id: string;
  /** chi e' fuori. Risolto come per i giri, in una query batch sola. */
  persona: User;
  tipo: 'negozio' | 'birra' | 'zona';
  nota?: string;
  citta: string;
  /** il quartiere, testo libero: e' quello che si legge, non le coordinate */
  zona?: string;
  /** arrotondate (~1 km) nella vista pubblica, come per i giri */
  lat: number;
  lng: number;
  finisceAlle: string;
  stato: 'aperta' | 'chiusa' | 'scaduta';
  createdAt: string;
  /** distanza da me, calcolata sul client quando c'e' il GPS */
  distanzaKm?: number;
};
