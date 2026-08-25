/**
 * COSA E' CAMBIATO — il diario che l'app legge a chi la usa.
 *
 * Segnalazione del collaudo: «ogni volta che arriva un aggiornamento deve
 * arrivare un messaggio in app in cui dice che è stata aggiornata e quali sono
 * le novità». Prima l'app si riavviava e basta: sotto le dita, senza dire
 * niente, potenzialmente mentre stavi scrivendo a chi ti sta portando le
 * birre.
 *
 * PERCHE' STA QUI E NON NEL MESSAGGIO DI `eas update`. Quel messaggio non
 * arriva in modo affidabile al codice, e soprattutto non e' versionato insieme
 * alla modifica che descrive. Se il diario sta nel repository, chi cambia il
 * codice non puo' dimenticarselo: sta nello stesso commit.
 *
 * COME SI SCRIVE UNA RIGA — tre regole, e sono strette apposta:
 *  1. Una riga per cambiamento, dal punto di vista di chi usa l'app.
 *     «Adesso puoi…», «Non succede piu' che…». Mai «fix», mai un numero di
 *     versione, mai un nome di file.
 *  2. «Risolto bug nel feed» non dice niente a nessuno. Si scrive «Il feed non
 *     si svuota piu' tirando giu'».
 *  3. Se un cambiamento non si riesce a scrivere cosi', non va nel diario. Non
 *     tutto quello che si tocca interessa a chi usa l'app, e un elenco pieno di
 *     cose invisibili insegna a non leggerlo piu'.
 */
export type Novita = { data: string; righe: string[] };

/** Dalla piu' recente. La prima e' quella che compare dopo un aggiornamento. */
export const NOVITA: Novita[] = [
  {
    data: '2026-08-25',
    righe: [
      'C’è un tasto nuovo in mezzo alla barra: dì che sei fuori, e chi ha bisogno di birre in zona ti vede.',
      'Chi è fuori adesso compare in cima alla schermata iniziale e sulla mappa.',
      'Se passi da un negozio, qualcuno può chiederti un giro con un tocco.',
      'Vedi chi ha accettato il tuo giro: nome, faccia e profilo, prima che suoni al portone.',
      'Un giro fermato da una segnalazione lo dice, invece di lasciarti premere pulsanti che non funzionano.',
      'Puoi annullare un giro anche dopo che qualcuno ha accettato: gli arriva il perché.',
      'I giri scaduti non ti bloccano più: non occupano un posto e non tengono fermi i BeerCoin.',
      'Nella segnalazione il pulsante «invia» si raggiunge anche con un messaggio lungo.',
      'Se hai un amico, puoi scrivergli anche senza aver mai fatto un giro insieme.',
      'Gli amici stanno nel profilo, e chi hai bloccato si può sbloccare.',
      'Il feed non dice più «per te»: si ordina per chi finisce prima, e si può cambiare.',
      'In Impostazioni c’è la versione che stai usando, e il link al codice: è tutto pubblico.',
    ],
  },
];
