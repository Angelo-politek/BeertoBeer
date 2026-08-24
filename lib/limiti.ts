/**
 * I LIMITI DEL GIOCO.
 *
 * Chi comanda è il database: questi valori sono una COPIA dichiarata, che
 * serve solo a dire le cose prima, mentre si compila il modulo, invece di far
 * premere «Pubblica» e rispondere con un errore.
 *
 * Il test lib/__tests__/limiti.test.ts legge la migrazione
 * 20260831_regole_e_limiti.sql e fallisce se i numeri divergono. Non è una
 * precauzione teorica: in questo progetto la stessa formula scritta in due
 * posti è già costata tre correzioni, e un elenco di stati rimasto indietro ha
 * bloccato la chat proprio quando serviva.
 *
 * Prima di questa versione non esisteva NESSUN limite: né di frequenza, né di
 * quantità. Si potevano aprire giri all'infinito e chiedere 50 birre.
 */

/** Giri contemporaneamente aperti per persona. */
export const MAX_GIRI_APERTI = 3;

/** Giri lanciabili nelle ultime 24 ore, annullati compresi. */
export const MAX_GIRI_AL_GIORNO = 8;

/**
 * Birre per singolo giro.
 * Oltre questa soglia non è più un favore fra vicini: è un trasloco. E siccome
 * i BeerCoin si fermano a 10 molto prima, senza un tetto le birre in più
 * sarebbero gratis.
 */
export const MAX_BIRRE_PER_GIRO = 24;

/** Quante birre chiede questa lista in tutto. */
export function birreTotali(birre: { quantita?: number | string }[]): number {
  return birre.reduce((somma, b) => somma + Math.max(1, Number(b.quantita) || 1), 0);
}
