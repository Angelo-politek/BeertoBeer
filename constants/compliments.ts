/**
 * Complimenti rapidi dopo uno scambio: feedback social leggero oltre alle stelle.
 * Le CHIAVI sono salvate nel DB (compliments.tipo); le label stanno solo qui.
 */

export type ComplimentDef = {
  key: string;
  label: string;
  emoji: string;
};

export const COMPLIMENTS: ComplimentDef[] = [
  { key: 'compagnia', label: 'Gran compagnia', emoji: '😄' },
  { key: 'puntuale', label: 'Puntualissimo', emoji: '⏱️' },
  { key: 'birra_fredda', label: 'Birra fredda perfetta', emoji: '🧊' },
  { key: 'simpatico', label: 'Simpatico', emoji: '🤙' },
  { key: 'affidabile', label: 'Affidabile', emoji: '🤝' },
];

/** key → "emoji label", per mostrare i complimenti ricevuti. */
export const COMPLIMENT_LABELS: Record<string, string> = Object.fromEntries(
  COMPLIMENTS.map((c) => [c.key, `${c.emoji} ${c.label}`]),
);
