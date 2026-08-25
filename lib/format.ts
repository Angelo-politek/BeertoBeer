const MESI = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
];

/** Formatta una data ISO come "30 giu" (giorno + mese abbreviato). */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
}

/**
 * "3 minuti fa", "2 ore fa", "ieri". Serve ovunque si mostri quanto e' vecchia
 * una cosa — l'ultima posizione di chi porta, da quanto un giro non si muove,
 * quando e' arrivata una segnalazione.
 *
 * Era scritta a mano dentro la safety map, che e' il modo in cui due schermate
 * finiscono per dire "2h fa" e "2 ore fa" della stessa cosa.
 */
export function relative(iso: string): string {
  const minuti = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minuti < 1) return 'un attimo fa';
  if (minuti < 60) return `${minuti} ${minuti === 1 ? 'minuto' : 'minuti'} fa`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`;
  const giorni = Math.round(ore / 24);
  if (giorni === 1) return 'ieri';
  return `${giorni} giorni fa`;
}
