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

export const CREDIT_BASE = 1;
export const CREDIT_PER_KG = 0.5;
export const CREDIT_PER_KM = 0.5;
export const CREDIT_CAP = 10;

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
