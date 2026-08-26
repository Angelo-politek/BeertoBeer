import type { BrandIconName } from '@/components/ui/brand-icon';

export const TOKEN_NAME = 'BeerCoin';
export const TOKEN_SHORT = 'BC';
export const TOKEN_EMOJI = '';
export function formatTokens(n: number, short = false): string { return `${n} ${short ? TOKEN_SHORT : TOKEN_NAME}`; }

/**
 * Le parole ufficiali dell'app. Fonte UNICA: se una parola chiave compare
 * scritta a mano in una schermata, prima o poi diverge.
 *
 * È già successo, ed è costato la segnalazione più grave della beta: la
 * schermata iniziale diceva «GIRI IN ZONA», «GIRI APERTI», «GIRO ATTIVO», ma
 * il pulsante per crearne uno diceva «Chiedi una birra» e portava a una
 * schermata intitolata «Nuova richiesta». Chi pensava "voglio lanciare un
 * giro" cercava quella parola e non la trovava da nessuna parte fra le azioni.
 *
 * Questo glossario esisteva già da allora — semplicemente non era usato da
 * nessuno. Ora lo è: le parole si cambiano qui, e cambiano ovunque.
 */
export const GLOSSARY = {
  shopSingular: 'negozio',
  shopPlural: 'negozi',
  /** L'oggetto: una consegna di birre fra due persone. */
  delivery: 'giro',
  deliveryPlural: 'giri',
  /** L'azione di pubblicarne uno. Le parole che Alessio ha usato spontaneamente. */
  createDeliveryAction: 'Lancia un giro',
  createDeliveryTitle: 'Nuovo giro',
  /** Cosa succede dopo: si mette accanto all'azione, non dentro la schermata. */
  createDeliveryHint: 'Dici cosa vuoi e dove: chi passa da un negozio te le porta.',
  /** I due ruoli. Mai "utente", mai "driver". */
  roleAsker: 'chi chiede',
  roleCarrier: 'chi porta',
} as const;
/**
 * LE FRASI DEL MARCHIO.
 *
 * Vengono dalla brand bible. Una e' stata corretta, ed e' registrata in
 * `Brand/CORREZIONI.md` con il perche'.
 */
export const SLOGAN = {
  /**
   * La bible diceva «CONSEGNA. BEVI. RIPETI.».
   *
   * Ma la sua stessa VISION, due paragrafi sopra, dice «non e' un servizio di
   * delivery» — e poi il manifesto usava il verbo del delivery. Non era l'app
   * a contraddire il marchio: era il marchio a contraddire se stesso.
   *
   * «Porta» e' anche piu' forte: «consegna» e' un ordine che si da' a un
   * fattorino, «porta» e' quello che chiedi a un amico.
   */
  ritmo: 'PORTA. BEVI. RIPETI.',
  /** Invariata: e' gia' del glossario, e dice due cose in quattro parole. */
  apertura: 'OPEN SOURCE. OPEN BEER.',
  /** Invariata. E' la frase che ha battezzato «FUORI». */
  strada: 'TI MANCA UNA BIRRA? QUALCUNO È GIÀ IN STRADA.',
  /** Dentro l'app «crediti» non si dice: evoca un conto in banca. */
  moneta: 'SOLO BEERCOIN, MAI SOLDI',
} as const;

/* La riga di filosofia dell'onboarding e' in `constants/testi/ingresso.ts`. */

/** Compatibilità V1: livelli e badge non avanzano più e non sono mostrati nella V2. */
export type LevelDef = { level: number; titolo: string; emoji: string; scambiRichiesti: number; bonusPt: number };
export const LEVELS: LevelDef[] = [{ level: 0, titolo: 'Community', emoji: '', scambiRichiesti: 0, bonusPt: 0 }];
export function levelForScambi(_scambi: number): LevelDef { return LEVELS[0]; }
export function nextLevel(_scambi: number): LevelDef | null { return null; }

/*
 * QUI C'ERANO TRE NUMERI, E DICEVANO TUTTI E TRE UNA COSA DIVERSA DAL DATABASE.
 *
 *   WELCOME_TOKENS = 10   il database ne accredita 5
 *   REFERRAL_TOKENS = 5   lib/credits.ts dice 3, il database ne conia 5+5
 *   NIGHT_BONUS_PT = 2    e "PT" e' la vecchia moneta, che non esiste piu'
 *
 * Nessuno li leggeva, ed e' proprio per questo che erano rimasti sbagliati:
 * un numero che nessuno usa non lo corregge nessuno, e prima o poi qualcuno lo
 * copia dentro una schermata. La fonte unica dei premi e' lib/credits.ts, che
 * dichiara di essere uno specchio del SQL e ha un test che lo verifica.
 */
export const NIGHT_FROM_HOUR = 22;
export type BadgeDef = { key: string; nome: string; descrizione: string; emoji: string; rewardPt: number; categoria: 'delivery' | 'social' | 'milestone' | 'infamia' };
export const BADGES: BadgeDef[] = [];
export const BADGE_BY_KEY: Record<string, BadgeDef> = {};
export const BANNED_BEERS: string[] = [];
export function containsBannedBeer(_names: string[]): boolean { return false; }

/*
 * LE SLIDE DELL'ONBOARDING SONO IN `constants/testi/ingresso.ts`.
 *
 * Stavano qui, ma non sono marchio: sono il copy di una schermata. La
 * differenza non e' accademica — il marchio si cambia con un commit in
 * `Brand/CORREZIONI.md` e la firma di chi lo custodisce, il copy si riscrive
 * quando serve. Tenerli insieme rendeva l'uno pesante come l'altro.
 *
 * Restano qui SLOGAN, il glossario e i link: quelli sono identita'.
 */

/**
 * Dove si scarica l'APK, per il messaggio d'invito.
 *
 * Chi riceve un invito NON ha ancora l'app: senza questo link deve chiedere
 * dove prenderla, e metà delle persone si ferma lì.
 *
 * ⚠️ Deve essere un indirizzo apribile da CHIUNQUE, senza account e senza
 * login. Gli allegati delle release di un repository PRIVATO non lo sono:
 * chi non è collaboratore riceve una pagina di errore.
 *
 * Si aggiorna via `eas update`, senza ricompilare: quando pubblichi un APK
 * nuovo basta cambiare questa riga e mandare l'aggiornamento.
 * Lascia stringa vuota per non mettere il link nel messaggio.
 */
/**
 * Dove si scarica l'app, per il messaggio d'invito.
 *
 * Chi riceve un invito NON ha ancora l'app: senza questo link deve chiedere
 * dove prenderla, e meta' delle persone si ferma li'.
 *
 * Punta a `releases/latest`, che segue sempre l'ultima release pubblicata e
 * non va piu' aggiornato a mano. Funziona perche' il repository e' pubblico:
 * gli allegati delle release di un repository privato danno una pagina di
 * errore a chi non e' collaboratore — ed e' il motivo per cui prima qui c'era
 * un link fissato su un tag.
 *
 * ⚠️ Perche' regga, la release non deve essere marcata «pre-release» e
 *    l'allegato deve chiamarsi esattamente `beer-to-beer.apk`.
 */
export const APK_URL =
  'https://github.com/Angelo-politek/BeertoBeer/releases/latest/download/beer-to-beer.apk';

/** Il codice e' pubblico, ed e' il punto: AGPLv3, chiunque puo' leggerlo. */
export const REPO_URL = 'https://github.com/Angelo-politek/BeertoBeer';
export const ISSUES_URL = 'https://github.com/Angelo-politek/BeertoBeer/issues';
