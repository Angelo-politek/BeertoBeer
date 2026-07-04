/**
 * BRANDING & COMUNICAZIONE — punto unico per moneta, glossario, livelli, badge e copy.
 *
 * Filosofia: Beer to Beer NON è un servizio di consegna a domicilio. È uno
 * scambio di favori tra pari e, soprattutto, un modo per conoscere gente della
 * propria zona. Tono ironico ma misurato (riferimenti Peroni, "Spaccia Peroni",
 * Moretti bandite) senza confondere chi arriva nuovo.
 *
 * NB: i valori dei reward qui sono SOLO per la UI/preview. La fonte di verità
 * dei crediti resta lato SQL (supabase/schema.sql + migration gamification).
 */

// ---------- Moneta ----------

export const TOKEN_NAME = 'PeroniToken';
export const TOKEN_SHORT = 'PT';
export const TOKEN_EMOJI = '🍺';

/** "12 PeroniToken" / "12 PT" a seconda del contesto. */
export function formatTokens(n: number, short = false): string {
  return short ? `${n} ${TOKEN_SHORT}` : `${n} ${TOKEN_NAME}`;
}

// ---------- Glossario / naming ----------

export const GLOSSARY = {
  /** i negozi mappati dalla community */
  shopSingular: 'Spaccia Peroni',
  shopPlural: 'Spaccia Peroni',
  /** una consegna, in gergo */
  delivery: 'giro',
  deliveryPlural: 'giri',
} as const;

/** Filosofia p2p — usata nell'onboarding e negli empty state. */
export const PHILOSOPHY_TAGLINE = 'Non è un delivery. È lo scambio di favori (e birre) tra vicini.';

// ---------- Livelli Peroni ----------

export type LevelDef = {
  /** livello 0-based crescente */
  level: number;
  /** titolo mostrato su profilo/chat */
  titolo: string;
  emoji: string;
  /** scambi confermati necessari per raggiungerlo (soglia minima) */
  scambiRichiesti: number;
  /** bonus una tantum al raggiungimento (mirror SQL) */
  bonusPt: number;
};

/**
 * Soglie livelli. MIRROR di public.level_for_scambi() nella migration SQL:
 * qualsiasi modifica va replicata di là.
 */
export const LEVELS: LevelDef[] = [
  { level: 0, titolo: 'Assetato', emoji: '🫗', scambiRichiesti: 0, bonusPt: 0 },
  { level: 1, titolo: 'Novizio', emoji: '🍺', scambiRichiesti: 1, bonusPt: 2 },
  { level: 2, titolo: 'Peronista', emoji: '🟦', scambiRichiesti: 5, bonusPt: 5 },
  { level: 3, titolo: 'Spaccia Peroni', emoji: '👑', scambiRichiesti: 15, bonusPt: 10 },
  { level: 4, titolo: 'Re della Peroni', emoji: '🏆', scambiRichiesti: 40, bonusPt: 20 },
];

/** Livello raggiunto per un dato numero di scambi confermati. Mirror SQL. */
export function levelForScambi(scambi: number): LevelDef {
  let current = LEVELS[0];
  for (const l of LEVELS) if (scambi >= l.scambiRichiesti) current = l;
  return current;
}

/** Livello successivo (null se già al massimo), per mostrare il progresso. */
export function nextLevel(scambi: number): LevelDef | null {
  return LEVELS.find((l) => l.scambiRichiesti > scambi) ?? null;
}

// ---------- Reward PeroniToken (mirror SQL) ----------

/** Bonus di benvenuto alla registrazione. Mirror di handle_new_user(). */
export const WELCOME_TOKENS = 10;

/** Bonus extra al driver per un giro consegnato dopo le 22. Mirror confirm_order(). */
export const NIGHT_BONUS_PT = 2;
/** Ora (0-23) da cui scatta il bonus notturno. */
export const NIGHT_FROM_HOUR = 22;

/** Bonus referral (a invitante e invitato). Mirror award_tokens('referral'). */
export const REFERRAL_TOKENS = 5;

// ---------- Catalogo badge (mirror del seed SQL della tabella badges) ----------

export type BadgeDef = {
  key: string;
  nome: string;
  descrizione: string;
  emoji: string;
  rewardPt: number;
  categoria: 'delivery' | 'social' | 'milestone' | 'infamia';
};

/**
 * Catalogo badge. MIRROR del seed in migration SQL (tabella `badges`). La UI usa
 * questo per mostrare anche i badge NON ancora sbloccati; l'assegnazione e il
 * reward reale avvengono lato SQL (unlock_badge).
 */
export const BADGES: BadgeDef[] = [
  {
    key: 'first_delivery',
    nome: 'Primo Giro',
    descrizione: 'Hai consegnato la tua prima birra. Ora sei uno di noi.',
    emoji: '🚴',
    rewardPt: 3,
    categoria: 'delivery',
  },
  {
    key: 'first_request',
    nome: 'Prima Sete',
    descrizione: 'Hai completato la tua prima richiesta.',
    emoji: '🙏',
    rewardPt: 1,
    categoria: 'milestone',
  },
  {
    key: 'deliveries_5',
    nome: 'Fattorino della Peroni',
    descrizione: '5 giri consegnati. Il quartiere ti ringrazia.',
    emoji: '🏅',
    rewardPt: 5,
    categoria: 'delivery',
  },
  {
    key: 'deliveries_10',
    nome: 'Spaccia Peroni',
    descrizione: '10 giri consegnati. Sei una colonna della community.',
    emoji: '🥇',
    rewardPt: 8,
    categoria: 'delivery',
  },
  {
    key: 'deliveries_25',
    nome: 'Leggenda del Nastro',
    descrizione: '25 giri consegnati. Rispetto.',
    emoji: '🏆',
    rewardPt: 15,
    categoria: 'delivery',
  },
  {
    key: 'night_owl',
    nome: 'Giro di Notte',
    descrizione: 'Hai consegnato dopo le 22. Eroe notturno.',
    emoji: '🦉',
    rewardPt: 3,
    categoria: 'delivery',
  },
  {
    key: 'social_butterfly',
    nome: 'Anima della Compagnia',
    descrizione: 'Hai conosciuto almeno 5 persone nuove.',
    emoji: '🦋',
    rewardPt: 5,
    categoria: 'social',
  },
  {
    key: 'profile_complete',
    nome: 'Faccia Pulita',
    descrizione: 'Foto, bio e preferenze: profilo completo.',
    emoji: '✨',
    rewardPt: 2,
    categoria: 'social',
  },
  {
    key: 'zone_king',
    nome: 'Re del Quartiere',
    descrizione: 'Hai conquistato una zona della tua città.',
    emoji: '👑',
    rewardPt: 10,
    categoria: 'milestone',
  },
  {
    key: 'ambassador',
    nome: 'Ambasciatore Peroni',
    descrizione: 'Hai invitato un amico nella community.',
    emoji: '🤝',
    rewardPt: REFERRAL_TOKENS,
    categoria: 'social',
  },
  {
    key: 'infame',
    nome: 'Infame',
    descrizione: 'Hai ordinato delle Moretti. Le Moretti qui sono bandite. Vergogna.',
    emoji: '🚨',
    rewardPt: 0,
    categoria: 'infamia',
  },
];

export const BADGE_BY_KEY: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b]),
);

/** Birre bandite: chi le ordina si becca il badge "Infame". Mirror SQL. */
export const BANNED_BEERS = ['moretti'];

/** true se una lista birre contiene una birra bandita (case-insensitive). */
export function containsBannedBeer(nomi: string[]): boolean {
  return nomi.some((n) => BANNED_BEERS.some((b) => n.toLowerCase().includes(b)));
}

// ---------- Copy onboarding (filosofia + social) ----------

export type OnboardingSlide = {
  emoji: string;
  titolo: string;
  testo: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    emoji: '🍺',
    titolo: 'Beer to Beer non è un delivery',
    testo:
      'Qui nessuno "ordina e basta". È uno scambio di favori tra vicini: oggi porti tu una birra a qualcuno, domani qualcuno la porta a te.',
  },
  {
    emoji: '🤝',
    titolo: 'Si guadagna conoscendo gente',
    testo:
      'Ogni giro che consegni ti dà PeroniToken e — soprattutto — una persona nuova nella tua zona con cui continuare a scriverti e bere insieme.',
  },
  {
    emoji: '🏆',
    titolo: 'Sali di livello, conquista il quartiere',
    testo:
      'Badge, livelli, missioni e la conquista delle zone della tua città. Più aiuti la community, più conti. (E le Moretti qui sono bandite.)',
  },
  {
    emoji: '🎁',
    titolo: '10 PeroniToken di benvenuto',
    testo:
      'Bastano per i tuoi primi giri. Poi si guadagnano contribuendo: consegnando, sbloccando badge e invitando amici. Non si comprano: si meritano.',
  },
];
