import { PAROLE } from './parole';

/**
 * IL GIRO: lanciarlo, seguirlo, chiuderlo, raccontarlo.
 *
 * ⚠️ QUESTO FILE CONTIENE IL VOCABOLARIO CONDIVISO DEL GIRO, non solo il copy
 *    di una schermata. `STATO_LABEL`, le etichette di `nextOrderAction` e i
 *    motivi per cui un giro è fermo vivevano sparsi fra `lib/orders.ts` e
 *    `lib/discovery.ts`, cioè in due file di logica: erano testo letto a
 *    schermo da home, dettaglio e «I miei giri» insieme, e nessuno poteva
 *    rileggerli tutti di fila per accorgersi che non parlavano la stessa
 *    lingua.
 *
 * ⚠️ Gli STATI non si toccano come CHIAVI. `orders.stato` ha un vincolo chiuso
 *    nel database e `ORDER_TIMELINE` ci indicizza dentro: qui si cambia solo
 *    la frase che si legge, mai il nome dello stato. Aggiungere un valore
 *    nuovo a `orders.stato` è vietato dalla regola R2.
 */
export const GIRO = {
  /**
   * Come si chiama a schermo ogni stato del giro.
   * Le chiavi sono quelle del database e non si cambiano: si cambia il valore.
   */
  stato: {
    richiesto: 'In attesa',
    accettato: 'Accettato',
    in_consegna: 'In arrivo',
    arrivato: 'Arrivato',
    consegnato: 'Consegnato',
    confermato: 'Completato',
    annullato: 'Annullato',
  },

  /**
   * PERCHÉ SU QUESTO GIRO NON SI PUÒ PIÙ FARE NIENTE.
   *
   * Una frase da mostrare, non un booleano da interpretare: al collaudo un
   * giro rimosso restava «GIRO ATTIVO» in cima alla home, e dopo «non mi sento
   * al sicuro» la schermata era identica a prima con i pulsanti che il server
   * ormai rifiutava.
   */
  fermo: {
    /** ⚠️ Diceva «una segnalazione e in verifica»: senza accento. */
    congelato: 'Fermo: una segnalazione è in verifica',
    rimosso: 'Rimosso dalla moderazione',
    oscurato: 'In verifica',
    scaduto: 'Scaduto',
  },

  /**
   * LA PROSSIMA COSA DA FARE, dal punto di vista di chi guarda.
   *
   * Sono le uniche frasi dell'app che cambiano a seconda di chi sei: la stessa
   * riga dice «Parti quando sei pronto» a chi porta e «Chi porta si sta
   * organizzando» a chi ha chiesto. Per questo stanno vicine — perché si
   * leggano a coppie e non si contraddicano.
   */
  azione: {
    annullato: `${PAROLE.giro} annullato`,
    aspettaChiPorta: `Aspetta ${PAROLE.chiPorta}`,
    puoiAccettare: 'Puoi accettare',
    parti: 'Parti quando sei pronto',
    siStaOrganizzando: `${PAROLE.chiPorta} si sta organizzando`,
    segnaArrivo: 'Segna il tuo arrivo',
    inArrivo: 'La birra è in arrivo',
    inserisciCodice: 'Inserisci il codice',
    comunicaCodice: 'Comunica il codice',
    attendiConferma: 'Attendi l’altra conferma',
    confermaScambio: 'Conferma lo scambio',
    lasciaRecensione: 'Lascia una recensione',
  },

  /**
   * PERCHÉ QUESTO GIRO COMPARE QUI — solo fatti, mai giudizi.
   *
   * ⚠️ Qui c'era anche «Persona affidabile», che l'app pronunciava quando il
   *    rating medio superava 4,5: era `smartScore` con il numero limato via,
   *    ed è morto con lui. Non rimettere frasi che valutano una persona: i
   *    fatti sì, le pagelle no.
   */
  perche: {
    vicino: 'Molto vicino a te',
    /** ⚠️ Voce funzione: la fascia oraria entra nel testo. */
    fascia: (quando: string) => `Serve ${quando.toLowerCase()}`,
  },

  /** «I miei giri»: le quattro categorie e le card. */
  miei: {
    titolo: `I miei ${PAROLE.giri}`,
    /** Le quattro lenti. Non si escludono: «In corso» guarda lo stato, le altre la prossima azione. */
    daFare: 'Da fare',
    inCorso: 'In corso',
    inAttesa: 'In attesa',
    conclusi: 'Conclusi',

    haiChiesto: 'Hai chiesto',
    /** ⚠️ Voce funzione: il nome di chi ospita entra nel testo. */
    staiPortando: (nome: string) => `Stai portando a ${nome}`,

    /** Badge che vincono sull'etichetta di stato. */
    rimossa: 'Rimossa',
    inVerifica: 'In verifica',
    scaduta: 'Scaduta',

    vuotoTitolo: 'Niente da mostrare',
    vuotoTesto: `Qui compaiono i ${PAROLE.giri} in base alla prossima cosa da fare.`,
    vuotoAzione: `Lancia un ${PAROLE.giro}`,

    erroreTitolo: `${PAROLE.giri.charAt(0).toUpperCase()}${PAROLE.giri.slice(1)} non disponibili`,
    erroreTesto: 'Controlla la connessione e riprova.',
  },

  /**
   * LA RECENSIONE.
   *
   * ⚠️ È l'ultimo passo dello scambio, non un extra: un giro concluso e non
   *    recensito resta fra le cose da fare finché non lo si scrive.
   */
  recensione: {
    titolo: 'Lascia una recensione',
    titoloBreve: 'Recensione',
    /** ⚠️ Voce funzione: il nome entra nel testo. */
    comeAndata: 'Com’è andato lo scambio?',
    puntualita: 'Puntualità',
    comunicazione: 'Comunicazione',
    rispetto: 'Rispetto',
    complimento: 'Un complimento, se ti va',
    commento: 'Commento',
    commentoSegnaposto: 'Racconta com’è andata',
    salva: 'Salva la recensione',
    salvata: 'Recensione salvata',

    nonDisponibile: 'Recensione non disponibile',
    nonCaricata: 'Recensione non raggiungibile. Controlla la connessione e riprova.',
    nonSalvata: 'Recensione non salvata. Riprova fra poco.',
    /** Il complimento è un extra: se non parte, la recensione resta valida. */
    complimentoNonPartito: 'Il complimento non è partito, ma la recensione sì.',
  },
} as const;
