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
    data: '2026-08-26',
    righe: [
      'Chi è fuori non mostra più la via: solo il quartiere. Era un errore nostro, ed è la prima cosa che abbiamo sistemato.',
      'Sulla mappa si vedono tutti quelli che sono fuori, non solo l’ultimo.',
      'I giri aperti sono tornati in cima, e chi è fuori subito sotto.',
      'Il tuo invito è una tessera, con sopra il nome di chi hai scelto. E il codice si copia con un tocco.',
      'Incontri ed eventi mostrano l’indirizzo, e un tocco apre le indicazioni.',
      'Un incontro si può annullare: chi si era iscritto viene avvisato.',
      'Nel giro, «sono in ritardo» lo vede solo chi porta — e i pulsanti dei guai compaiono quando c’è un guaio possibile.',
      'Tornando indietro da un sottomenu non perdi più il punto in cui stavi leggendo.',
      'Con i caratteri di sistema ingranditi non sborda più niente.',
    ],
  },
  {
    data: '2026-08-25',
    righe: [
      'C’è un tasto nuovo in mezzo alla barra: dì che sei fuori, e chi ha bisogno di birre in zona ti vede.',
      'Vedi chi ha accettato il tuo giro, prima che suoni al portone.',
      'I giri scaduti non ti bloccano più.',
      'Nella segnalazione il pulsante «invia» si raggiunge anche con un messaggio lungo.',
      'Se hai un amico, puoi scrivergli anche senza aver mai fatto un giro insieme.',
      'Il feed non dice più «per te»: si ordina per chi finisce prima.',
      'In Impostazioni c’è la versione che stai usando, e il link al codice: è tutto pubblico.',
    ],
  },
];
