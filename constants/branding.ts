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
export const PHILOSOPHY_TAGLINE = 'Non è un delivery. È uno scambio di favori tra persone della stessa città.';

/** Compatibilità V1: livelli e badge non avanzano più e non sono mostrati nella V2. */
export type LevelDef = { level: number; titolo: string; emoji: string; scambiRichiesti: number; bonusPt: number };
export const LEVELS: LevelDef[] = [{ level: 0, titolo: 'Community', emoji: '', scambiRichiesti: 0, bonusPt: 0 }];
export function levelForScambi(_scambi: number): LevelDef { return LEVELS[0]; }
export function nextLevel(_scambi: number): LevelDef | null { return null; }

export const WELCOME_TOKENS = 10;
export const NIGHT_BONUS_PT = 2;
export const NIGHT_FROM_HOUR = 22;
export const REFERRAL_TOKENS = 5;
export type BadgeDef = { key: string; nome: string; descrizione: string; emoji: string; rewardPt: number; categoria: 'delivery' | 'social' | 'milestone' | 'infamia' };
export const BADGES: BadgeDef[] = [];
export const BADGE_BY_KEY: Record<string, BadgeDef> = {};
export const BANNED_BEERS: string[] = [];
export function containsBannedBeer(_names: string[]): boolean { return false; }

export type OnboardingSlide = { icon: BrandIconName; titolo: string; testo: string };
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  { icon: 'cheers', titolo: 'NON È UN DELIVERY', testo: 'Oggi porti tu una birra. Domani qualcuno la porta a te. Nessuno ci guadagna sopra.' },
  { icon: 'wallet', titolo: 'SOLO BEERCOIN', testo: 'Si guadagnano contribuendo. Non si comprano, non si trasferiscono e non diventano denaro.' },
  { icon: 'pin', titolo: 'PRIMA LA SICUREZZA', testo: 'L’indirizzo resta protetto. Il codice chiude il giro solo quando siete davvero insieme.' },
  { icon: 'smile', titolo: 'VIBE, SE VUOI', testo: 'Puoi invitare chi porta a fermarsi. È sempre facoltativo e puoi cambiare idea.' },
];

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
export const APK_URL =
  'https://github.com/Angelo-politek/BeertoBeer/releases/download/v1.1.0-beta1/beer-to-beer.apk';

// NB: questo link punta a una versione PRECISA. Pubblicando una release nuova
// va aggiornato qui e mandato con `eas update` (nessuna ricompilazione).
// In alternativa, togliendo la spunta "pre-release" su GitHub diventa valido
// anche l'indirizzo .../releases/latest/download/beer-to-beer.apk, che punta
// sempre all'ultima versione e non va piu' toccato.
