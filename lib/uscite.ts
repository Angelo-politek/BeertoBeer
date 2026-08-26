import { FUORI } from '@/constants/testi';

import type { Uscita } from '@/types';

/**
 * LE USCITE — logica pura, senza schermate e senza mappa.
 *
 * Sta in lib/ e non dentro un componente per la stessa ragione di
 * lib/posizione.ts: si prova senza montare la mappa nativa, e un test puo'
 * confrontarla con il file .sql.
 *
 * ⚠️ I due numeri qui sotto sono duplicati DI PROPOSITO — vivono anche in
 * `supabase/migrations/20260908_uscite.sql`, che e' la fonte di verita' — e un
 * test legge quel file per verificare che non divergano. E' lo stesso patto
 * gia' in piedi per i limiti dei giri e per la tolleranza degli incontri.
 */

/**
 * Quanto puo' durare al massimo un'uscita.
 *
 * Sei ore sono una serata. Piu' a lungo non e' una serata: e' la tua posizione
 * pubblicata. E' il numero piu' delicato del modello, perche' un'uscita e' il
 * dato piu' sensibile che questa app raccolga — una persona dice dove sara' e
 * fino a quando.
 */
export const MAX_ORE_USCITA = 6;

/** Una persona non e' fuori in cinque modi insieme: sarebbe rumore. */
export const MAX_USCITE_APERTE = 2;

export type FormaUscita = 'negozio' | 'birra' | 'zona';

/**
 * Le tre facce. Le CHIAVI stanno qui perche' sono il contratto con il
 * database (`uscite.tipo` ha un check chiuso); le PAROLE stanno in
 * `constants/testi/fuori.ts`, dove si rileggono di fila.
 */
export const FORME: { key: FormaUscita; titolo: string; breve: string; spiega: string }[] = [
  { key: 'negozio', ...FUORI.forme.negozio },
  { key: 'birra', ...FUORI.forme.birra },
  { key: 'zona', ...FUORI.forme.zona },
];

export function formaDi(key: string): (typeof FORME)[number] {
  return FORME.find((f) => f.key === key) ?? FORME[2];
}

/** Le durate che si scelgono con un tocco. L'ultima e' il tetto. */
export function durateRapide(ora = new Date()): { label: string; fino: Date }[] {
  const fra = (ore: number) => new Date(ora.getTime() + ore * 3_600_000);
  return [
    { label: "Un'ora", fino: fra(1) },
    { label: 'Due ore', fino: fra(2) },
    { label: 'Tre ore', fino: fra(3) },
    { label: 'Fino a tardi', fino: fra(MAX_ORE_USCITA) },
  ];
}

export function uscitaFinita(uscita: Uscita, adesso = Date.now()): boolean {
  return uscita.stato !== 'aperta' || new Date(uscita.finisceAlle).getTime() <= adesso;
}

/** «fino alle 23», con i minuti solo quando non sono in punto. */
export function finoAlle(iso: string): string {
  const d = new Date(iso);
  const min = d.getMinutes();
  return `fino alle ${d.getHours()}${min ? `:${String(min).padStart(2, '0')}` : ''}`;
}
