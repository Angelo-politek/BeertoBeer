/**
 * Caricamenti che possono fallire senza portarsi dietro tutta la schermata.
 *
 * Il problema che risolve: molte schermate caricano più sezioni in parallelo e
 * ognuna ha un `.catch(() => [])` che restituisce vuoto. Se qualcosa va storto
 * la sezione appare semplicemente vuota, identica a quando non c'è davvero
 * niente — e chi usa l'app conclude che "non funziona" senza sapere perché.
 *
 * Con `withFallback` la schermata resta in piedi come prima, ma sa quante
 * sezioni sono andate male e può dirlo una volta sola, invece di riempire lo
 * schermo di avvisi o di tacere del tutto.
 */

/** Come usarlo: `const guasti = failureCounter()` e poi `withFallback(x, [], guasti.segnala)`. */
export function failureCounter() {
  let count = 0;
  return {
    segnala: () => {
      count += 1;
    },
    get quanti() {
      return count;
    },
  };
}

/** Esegue la promessa; se fallisce segnala il guasto e restituisce il ripiego. */
export function withFallback<T>(promise: Promise<T>, fallback: T, onError: () => void): Promise<T> {
  return promise.catch(() => {
    onError();
    return fallback;
  });
}

/** Messaggio unico per una schermata che si è caricata solo in parte. */
export const PARTIAL_LOAD_MESSAGE =
  'Alcune sezioni non si sono caricate. Tira giù per riprovare.';
