import type { BrandIconName } from '@/components/ui/brand-icon';

export const TOKEN_NAME = 'BeerCoin';
export const TOKEN_SHORT = 'BC';
export const TOKEN_EMOJI = '';
export function formatTokens(n: number, short = false): string { return `${n} ${short ? TOKEN_SHORT : TOKEN_NAME}`; }

export const GLOSSARY = { shopSingular: 'negozio', shopPlural: 'negozi', delivery: 'giro', deliveryPlural: 'giri' } as const;
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
