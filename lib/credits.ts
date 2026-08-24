import type { BeerItem } from '@/types';

/**
 * Anteprima crediti lato app. La FONTE DI VERITÀ è in supabase/schema.sql:
 * `credits_for_weight` (parte peso, usata dal trigger di insert) e
 * `accept_order` (bonus distanza driver→consegna). I valori qui sotto DEVONO
 * restare allineati (format_weight, BASE/W/D, CAP).
 *
 * Modello: alla creazione l'host offre solo la parte peso; quando un driver
 * accetta si aggiunge round(km · D) in base alla SUA distanza dal punto di
 * consegna. Totale mai oltre CREDIT_CAP né oltre il saldo dell'host.
 */

/** Pesi per formato (kg, contenitore incluso). Allineato a public.format_weight(). */
export const FORMAT_WEIGHTS: Record<string, number> = {
  '33cl': 0.55,
  '50cl': 0.85,
  '66cl': 1.1,
  '75cl': 1.3,
  lattina33: 0.4,
  lattina50: 0.58,
};

export const DEFAULT_FORMAT = '33cl';

/** Formati selezionabili nella UI di creazione. */
export const FORMATS: { key: string; label: string }[] = [
  { key: '33cl', label: '33 cl' },
  { key: '50cl', label: '50 cl' },
  { key: '66cl', label: '66 cl' },
  { key: '75cl', label: '75 cl' },
  { key: 'lattina33', label: 'Lattina 33' },
  { key: 'lattina50', label: 'Lattina 50' },
];

function formatWeight(formato?: string): number {
  return (formato && FORMAT_WEIGHTS[formato]) || FORMAT_WEIGHTS[DEFAULT_FORMAT];
}

/** Peso totale dell'ordine in kg. */
export function orderWeightKg(birre: BeerItem[]): number {
  return birre.reduce((sum, b) => sum + (Number(b.quantita) || 0) * formatWeight(b.formato), 0);
}

/**
 * TARATURA DEL 01/09/2026 (segnalazione: «rivedere il calcolatore delle
 * distanze e peso»). Chi si faceva 5 km a piedi con 13 kg di birra guadagnava
 * 2 BeerCoin in piu' di chi attraversava la strada, e il tetto a 10 tagliava
 * proprio i giri piu' faticosi: 24 birre a 5 km valevano 11 e venivano pagati
 * 10, come un giro medio. Lo sforzo in piu' era gratis.
 *
 * Km: 0.5 -> 1.0 (un chilometro, una moneta). Tetto: 10 -> 14.
 *
 * I BeerCoin non si creano qui: chi chiede paga, chi porta incassa. Alzare il
 * tetto non gonfia l'economia, ridistribuisce la fatica.
 */
export const CREDIT_BASE = 1;
export const CREDIT_PER_KG = 0.5;
export const CREDIT_PER_KM = 1.0;
export const CREDIT_CAP = 14;

/** Parte peso dei crediti: min(CAP, ceil(BASE + peso·W)). Mirror di credits_for_weight(). */
export function estimateCredits(birre: BeerItem[]): number {
  const peso = orderWeightKg(birre);
  return Math.min(CREDIT_CAP, Math.ceil(CREDIT_BASE + peso * CREDIT_PER_KG));
}

/** Margine massimo che il bonus distanza può aggiungere prima del cap. */
export function maxDistanceBonus(birre: BeerItem[]): number {
  return CREDIT_CAP - estimateCredits(birre);
}

/** Stima del bonus per una distanza driver→consegna nota (mirror di accept_order). */
export function estimateBonus(distKm: number): number {
  return Math.round(distKm * CREDIT_PER_KM);
}

/**
 * Reward BeerCoin non legati al peso/distanza. Mirror della migration
 * gamification (award_tokens / handle_new_user / gamify_on_confirm). Servono
 * SOLO alla UI ("come guadagnare"): l'accredito reale è lato SQL.
 */
export const REWARDS = {
  welcome: 5,
  notturno: 2,
  referral: 3,
  /** bonus una tantum per livello raggiunto (indice = livello) */
  livello: [0, 1, 2, 3, 5],
} as const;
