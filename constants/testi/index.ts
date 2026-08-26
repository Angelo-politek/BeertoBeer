/**
 * LE PAROLE DELL'APP, IN UN POSTO SOLO.
 *
 * Perché questa cartella esiste: l'app parlava in quattro modi. La schermata
 * iniziale diceva «GIRI IN ZONA», il pulsante per crearne uno diceva «Chiedi
 * una birra», e la schermata che apriva si intitolava «Nuova richiesta». Chi
 * pensava "voglio lanciare un giro" cercava quella parola fra le azioni e non
 * la trovava. È stata la segnalazione più grave della beta, e veniva da chi il
 * progetto lo conosce a memoria.
 *
 * LE ~90 STRINGHE DEL DATABASE sono già state riscritte, in una migrazione
 * sola (`20260910_le_parole_delle_push.sql`). Queste sono le altre.
 *
 * ---
 *
 * PERCHÉ UNA CARTELLA E NON UN FILE.
 *
 * Un file solo con quattrocento stringhe è un file che nessuno riapre, e con
 * più cantieri aperti in parallelo è un conflitto di merge garantito. La
 * divisione è per AREA DI PRODOTTO, non per schermata: una schermata si
 * spezza in due o cambia nome, un'area no.
 *
 *   parole    i nomi delle cose e i due ruoli. Ancorato al glossario.
 *   voce      le briciole che tornano ovunque: tasti, conferme, errori.
 *   ingresso  la soglia: accesso, registrazione, onboarding, invito.
 *   giro      lanciare un giro, seguirlo, chiuderlo.        [Ondata 1, S2]
 *   fuori     le uscite, il foglio, la mappa.               [Ondata 2]
 *   persone   profili, amici, incontri, blocchi.            [Ondata 1, S3]
 *   sistema   impostazioni, notifiche, novità, segnalazioni.[Ondata 1, S3]
 *   admin     il pannello.                                  [Ondata 1, S3]
 *
 * ⚠️ I cinque file ancora da aprire NON esistono come file vuoti, di
 *    proposito: un `export const {} as const` è una casella che aspetta, ed è
 *    lo stesso errore per cui `TOKEN_EMOJI` è stato cancellato invece che
 *    lasciato a stringa vuota. I nomi qui sopra bastano a prenotare l'area.
 *
 * ---
 *
 * LE TRE REGOLE DI FORMA. Valgono per ogni voce che entra qui.
 *
 * 1. `as const`, e la chiave nomina LA COSA, non la schermata che la mostra.
 *    Una stringa che si chiama `titoloLogin` muore quando la schermata cambia
 *    nome; `accesso.titolo` no.
 *
 * 2. SE UN VALORE ENTRA NEL TESTO, LA VOCE È UNA FUNZIONE. Mai concatenare
 *    fuori di qui. La schermata iniziale componeva una frase con un
 *    `toLowerCase()` sul posto: la frase risultante non esisteva in nessun
 *    file, e nessuno poteva rileggerla.
 *
 * 3. I NUMERI NON SI SCRIVONO NEI TESTI. Arrivano come parametro da
 *    `lib/credits.ts` e `lib/limiti.ts`, che dichiarano di essere lo specchio
 *    del SQL e hanno un test che lo verifica. Un numero copiato dentro una
 *    frase è un numero che il giorno dopo mente: è già successo tre volte
 *    («+5 BeerCoin» contro i 3 che arrivavano davvero).
 *
 * ---
 *
 * ⚠️ LA REGOLA CHE GOVERNA TUTTO: NESSUNA STRINGA ENTRA QUI SENZA ESSERE
 *    STATA RISCRITTA. Spostare una frase brutta dentro un dizionario non la
 *    sistema: la congela per due anni e le dà l'aria di essere stata decisa.
 *
 * Il contatore del lavoro è `lib/__tests__/glossario.test.ts`, controllo #2:
 * parte con ogni file in deroga e fallisce quando una deroga non serve più.
 * Quando la lista è vuota, C6 è finito. Nessun altro rendiconto serve.
 */

export { PAROLE } from './parole';
export { VOCE } from './voce';
export { INGRESSO, type SlideOnboarding } from './ingresso';
export { GIRO } from './giro';
export { PERSONE } from './persone';
