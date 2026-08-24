import type { Coords } from '@/lib/location';

/**
 * Una posizione come la vede chi compila un modulo: quello che ha scritto, e
 * il punto vero sulla mappa. Le due cose possono non coincidere, ed è il
 * motivo per cui esiste questo tipo: un indirizzo scritto e mai confermato
 * NON è una posizione.
 *
 * Sta in lib/ e non nel componente perché è logica pura: così si può provare
 * senza tirare dentro la mappa nativa.
 */
export type LocationValue = { indirizzo: string; coords: Coords | null };

/**
 * Cosa manca per poter pubblicare, in parole leggibili — oppure null se non
 * manca niente.
 *
 * Regola invariabile, uguale per un giro e per un incontro: senza coordinate
 * non si pubblica. Un indirizzo scritto a mano e mai confermato manda una
 * persona a girare per niente.
 */
export function mancanzaPosizione(value: LocationValue, cosa = "l'indirizzo"): string | null {
  if (value.indirizzo.trim().length === 0) return cosa;
  if (!value.coords) return "la conferma dell'indirizzo sulla mappa";
  return null;
}
