const MESI = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
];

/** Formatta una data ISO come "30 giu" (giorno + mese abbreviato). */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
}
