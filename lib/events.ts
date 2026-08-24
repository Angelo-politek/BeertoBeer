/**
 * LA TOLLERANZA DEGLI INCONTRI, DEFINITA UNA VOLTA SOLA.
 *
 * IL DIFETTO CHE HA GENERATO QUESTO FILE
 * `getEvents` elencava gli incontri fino a 6 ore DOPO l'orario, ma la funzione
 * del database `join_event_v21` li rifiutava appena `quando <= now()`. Per sei
 * ore l'incontro restava in elenco e sulla mappa, e chi provava a unirsi
 * riceveva un errore — per giunta senza spiegazione, perché la schermata
 * sostituiva il messaggio del server con «Operazione non riuscita».
 *
 * È lo stesso identico difetto della chat bloccata quando chi porta è
 * arrivato: un elenco cambiato da una parte e non dall'altra.
 *
 * Il numero qui sotto e l'`interval` dentro `join_event_v21` DEVONO restare
 * uguali. Non è una speranza: lo verifica
 * `lib/__tests__/tolleranza-incontri.test.ts`, che legge la migrazione.
 */
export const MINUTI_TOLLERANZA_INCONTRO = 360; // 6 ore

/** L'istante prima del quale un incontro non si vede e non si può più raggiungere. */
export function sogliaIncontriVisibili(adesso = Date.now()): Date {
  return new Date(adesso - MINUTI_TOLLERANZA_INCONTRO * 60 * 1000);
}

/**
 * Un incontro è «in corso» quando l'orario è passato ma si è ancora dentro la
 * tolleranza: si può ancora raggiungere chi c'è. Dirlo evita che sembri un
 * annuncio vecchio rimasto lì per sbaglio.
 */
export function incontroInCorso(quando: string, adesso = Date.now()): boolean {
  const inizio = new Date(quando).getTime();
  return inizio <= adesso && inizio > sogliaIncontriVisibili(adesso).getTime();
}
