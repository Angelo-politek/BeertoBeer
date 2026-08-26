/**
 * LE BRICIOLE CHE TORNANO OVUNQUE.
 *
 * Tasti, conferme, frasi di riserva quando il server non ha detto niente di
 * utile. Stanno qui e non nelle aree perché una frase ripetuta in sei
 * schermate diverge in sei modi diversi: è già successo con «Riprova»,
 * «Riprova più tardi», «Riprova fra poco» e «Riprovare?» tutte vive insieme.
 *
 * ⚠️ Le frasi di riserva si scrivono pensando a COSA PUÒ FARE chi legge, non
 *    a cosa è andato storto. `lib/errori.ts` lo dice per esteso: un errore che
 *    non dice cosa fare costa due volte.
 */
export const VOCE = {
  /** Azioni. Il maiuscolo lo mette `Button`, non il sorgente. */
  azione: {
    riprova: 'Riprova',
    annulla: 'Annulla',
    chiudi: 'Chiudi',
    salva: 'Salva',
    indietro: 'Indietro',
    /**
     * ⚠️ «Torna al login» era in tre schermate. «Login» è la sola parola
     *    inglese della soglia, e la schermata a cui porta si chiama «Accedi»:
     *    due nomi per la stessa porta, che è il difetto di questo repository.
     */
    tornaAllAccesso: 'Torna all’accesso',
  },

  /** Il selettore di città in cima al feed, quando non ne è scelta nessuna. */
  citta: 'Città',
  cambiaCitta: 'Cambia città',
  scegliCitta: 'Scegli la città',

  /** Etichette lette solo da chi usa TalkBack: contano quanto le altre. */
  tuaPosizione: 'La tua posizione',

  /** Quando il problema è la rete e non la persona. */
  rete: {
    assente: 'Connessione assente. Controlla la rete e riprova.',
    instabile: 'Connessione assente o instabile. Controlla la rete e riprova.',
  },

  /** Il tempo passato, detto come lo direbbe una persona. */
  quando: {
    adesso: 'un attimo fa',
    oreFa: (ore: number) => `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`,
  },

  /** Le foto: due errori che tornano in tre punti diversi. */
  foto: {
    permessoNegato: 'Permesso per accedere alle foto negato.',
    nonLeggibile: 'Immagine non leggibile.',
    posizioneNonValida: 'Posizione foto non valida.',
  },

  /** Caricamento parziale: alcune sezioni sì, altre no. */
  caricamentoParziale: 'Alcune sezioni non si sono caricate. Tira giù per riprovare.',

  /**
   * LA POSIZIONE — il campo indirizzo, la ricerca, il punto sulla mappa.
   *
   * Sta qui e non in un'area perché `LocationField` è lo stesso componente per
   * un giro, per un incontro e per un'uscita: `parita-giri-eventi.test.ts`
   * esiste apposta per garantirlo. Tre aree, un testo solo.
   *
   * ⚠️ Qui viveva l'«io» che il piano cita come esempio della regola:
   *    «Non sono riuscito a ricavare la via». E un'emoji 📍 su un pulsante.
   */
  posizione: {
    campoSegnaposto: 'Via e numero civico',
    usaLaMia: 'Usa la mia posizione',
    inCorso: 'Rilevamento…',
    scegliSullaMappa: 'Scegli sulla mappa',
    toccaPunto: 'Tocca il punto esatto',
    aiutoMappa: (citta: string) => `${citta} — sposta e zooma la mappa, poi tocca il punto.`,
    confermaPunto: 'Conferma il punto',

    ricercaKoTitolo: 'Ricerca non disponibile',
    ricercaKoTesto:
      'Il servizio mappe non risponde in questo momento. Riprova fra poco, oppure scegli subito il punto sulla mappa.',

    altroComuneTitolo: (comune: string) => `Quell’indirizzo è a ${comune}`,
    altroComuneTesto: (progetto: string, citta: string, comune: string) =>
      `${progetto} funziona dentro ${citta}: chi porta si muove a piedi o in bici, e ${comune} è un altro comune. Cerca un indirizzo in ${citta}, oppure cambia città dal feed.`,

    nonTrovatoTitolo: 'Indirizzo non trovato',
    nonTrovatoTesto: (citta: string) =>
      `Nessun risultato a ${citta}. Scrivilo in modo più preciso (via e numero civico), oppure scegli il punto sulla mappa.`,

    gpsKoTitolo: 'Posizione non disponibile',
    gpsKoTesto: 'Attiva il GPS e concedi il permesso di localizzazione, oppure scegli il punto sulla mappa.',

    fuoriCittaTitolo: 'Sei fuori città',
    fuoriCittaTesto: (citta: string) =>
      `La tua posizione non risulta dentro ${citta}. Cambia città dal feed, oppure scegli il punto sulla mappa.`,

    /** ⚠️ Diceva «Non sono riuscito a ricavare la via»: l'app in prima persona. */
    viaSconosciuta: 'La via non si ricava da qui: scrivila tu, il punto è già a posto.',

    mancaTitolo: 'Manca l’indirizzo',
    mancaTesto: 'Scrivi prima l’indirizzo.',
    puntoFuoriTitolo: 'Indirizzo fuori città',
    puntoFuoriTesto: (citta: string) =>
      `Il punto trovato è fuori da ${citta}. Controlla l’indirizzo, oppure scegli il punto sulla mappa.`,
  },

  /** Frasi di riserva: solo quando il server non ha detto niente di leggibile. */
  riserva: {
    riprovaFraPoco: 'Riprova fra poco.',
    nonSalvato: 'Non è stato salvato. Riprova fra poco.',
  },
} as const;
