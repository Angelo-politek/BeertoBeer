import { haversineKm, type Coords } from '@/lib/location';
import type { BeerItem } from '@/types';

/**
 * Anteprima crediti lato app. La FONTE DI VERITÀ è il trigger Postgres
 * `set_order_credits` in supabase/schema.sql: i valori qui sotto DEVONO restare
 * allineati a quelli (format_weight, BASE/W/D, punto di riferimento).
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

/** Punto di riferimento per la distanza (Torino centro). Allineato al trigger SQL. */
export const BASE_POINT: Coords = { lat: 45.0703, lng: 7.6869 };

const CREDIT_BASE = 1;
const CREDIT_PER_KG = 0.4;
const CREDIT_PER_KM = 1.2;

/**
 * Stima dei crediti = ceil(BASE + peso·W + distanza·D), dove la distanza è tra
 * le coordinate di consegna e il punto di riferimento. Se le coordinate mancano,
 * la distanza vale 0 (solo peso).
 */
export function estimateCredits(birre: BeerItem[], coords: Coords | null): number {
  const peso = orderWeightKg(birre);
  const dist = coords ? haversineKm(coords, BASE_POINT) : 0;
  return Math.ceil(CREDIT_BASE + peso * CREDIT_PER_KG + dist * CREDIT_PER_KM);
}
