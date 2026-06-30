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
};

/** Una voce della lista birre richiesta. Parte di `orders.lista_birre`. */
export type BeerItem = {
  nome: string;
  quantita: number;
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
  birre: BeerItem[];
  /** indirizzo di consegna (visibile per intero solo dopo l'accettazione) */
  indirizzo: string;
  /** distanza dall'utente in km (in Fase 1 calcolata da lat/lng) */
  distanzaKm: number;
  stato: OrderStatus;
  /** se true, l'host invita il driver a fermarsi a bere insieme */
  vibeMode: boolean;
  creditiOfferti: number;
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
