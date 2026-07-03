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

/** Un movimento nel ledger crediti. Schema: tabella `credit_transactions`. */
export type CreditTransaction = {
  id: string;
  descrizione: string;
  /** importo sempre positivo; la direzione è in `tipo` */
  importo: number;
  tipo: TransactionType;
  data: string;
};
