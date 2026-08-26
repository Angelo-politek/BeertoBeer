import { PERSONE } from '@/constants/testi';

/**
 * Complimenti rapidi dopo uno scambio: un riscontro leggero oltre alle stelle.
 *
 * Le CHIAVI sono salvate nel database (`compliments.tipo`) e non si toccano;
 * le parole stanno in `constants/testi/persone.ts`.
 *
 * ⚠️ QUI C'ERA UN CAMPO `emoji`, VALORIZZATO A STRINGA VUOTA SU TUTTE E CINQUE
 * LE VOCI, e un commento che prometteva «key → "emoji label"». Le emoji erano
 * gia' state tolte, il campo no: era una casella che aspetta di essere
 * riempita, cioe' esattamente il motivo per cui `TOKEN_EMOJI` e' stato
 * cancellato invece che svuotato. Un campo che nessuno valorizza e' un invito
 * a rimetterci dentro quello che avevamo appena tolto.
 */

export type ComplimentDef = {
  key: keyof typeof PERSONE.complimenti;
  label: string;
};

export const COMPLIMENTS: ComplimentDef[] = (
  Object.keys(PERSONE.complimenti) as (keyof typeof PERSONE.complimenti)[]
).map((key) => ({ key, label: PERSONE.complimenti[key] }));

/** key → parola, per mostrare i complimenti ricevuti. */
export const COMPLIMENT_LABELS: Record<string, string> = { ...PERSONE.complimenti };
