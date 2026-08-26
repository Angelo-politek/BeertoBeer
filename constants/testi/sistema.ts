import { PAROLE } from './parole';

/**
 * IL SISTEMA: impostazioni, notifiche, novità, regole, segnalazioni ricevute,
 * e le tre schermate della barra che non sono il profilo.
 *
 * ⚠️ È l'area in cui l'app parla di SE STESSA, ed è per questo che qui il
 *    «noi» e l'«io» erano più fitti che altrove: quando un'app spiega cosa fa,
 *    la tentazione di darle una voce propria è massima. Ne sono stati tolti
 *    tre («Sto preparando la città», «Non sono riuscito a salvare…», «Non
 *    riesco a leggere lo stato delle notifiche») più i quattro dei termini.
 */
export const SISTEMA = {
  /** LE IMPOSTAZIONI. */
  impostazioni: {
    titolo: 'Impostazioni',
    esci: 'Esci',
    sicurezzaTitolo: 'Sicurezza',
    notificheTitolo: 'Notifiche',
    regoleTitolo: 'Regole e privacy',
    profiloTitolo: 'Profilo e privacy',
    profiloTesto: 'Gestisci foto, bio, preferenze e disponibilità sociale.',
    modificaProfilo: 'Modifica profilo',

    sicurezzaTesto: `Chi hai bloccato, e le regole che valgono durante un ${PAROLE.giro}.`,
    bloccate: 'Persone bloccate',

    notificheTesto: 'Senza, non ti accorgi di chi chiede: qui vedi se sono attive e le provi.',
    gestisciNotifiche: 'Gestisci le notifiche',

    regoleTesto: `Come funzionano i ${PAROLE.gettone}, la moderazione e i dati personali.`,
    leggiRegole: 'Leggi le regole',

    codiceTitolo: 'Il codice è di tutti',
    vediCodice: 'Vedi il codice',
    segnalaProblema: 'Segnala un problema',
    cosaCambiato: 'Cos’è cambiato',
  },

  /** LA CASELLA DELLE NOTIFICHE. */
  notifiche: {
    titolo: 'Notifiche',
    nonCaricateTitolo: 'Notifiche non caricate',
    nonCaricateTesto: 'Controlla la connessione e tira giù per riprovare.',
    vuotaTitolo: 'Tutto tranquillo',
    vuotaTesto: 'Gli aggiornamenti importanti compaiono qui.',
  },

  /**
   * LE IMPOSTAZIONI DELLE NOTIFICHE.
   *
   * ⚠️ «Mandami una notifica di prova» resta in prima persona di proposito: è
   *    la persona che parla all'app, non l'app che parla di sé. È l'unica
   *    eccezione prevista dalle regole della voce — il tasto che dichiara
   *    qualcosa su di te parla con le tue parole.
   */
  notificheImpostazioni: {
    cosaTiArriva: 'Cosa ti arriva',
    percheContano: 'Perché contano',
    /** La descrizione del canale prioritario, letta nelle impostazioni Android. */
    /** Il nome del canale, come lo mostra Android nelle sue impostazioni. */
    canaleNome: 'Sicurezza e segnalazioni',
    canaleUrgente: `Allarmi durante un ${PAROLE.giro} e segnalazioni da verificare.`,

    attive: 'Questo telefono è registrato: le notifiche arrivano.',
    nonAttive: 'Non attive',
    nonAncoraAttive: 'Non sono ancora attive. Bastano due tocchi.',
    rifiutate:
      'Le hai rifiutate in passato. Android non le richiede più: vanno riattivate dalle impostazioni di sistema.',
    /** ⚠️ Diceva «Non riesco a leggere lo stato»: l'app in prima persona. */
    statoIgnoto: 'Lo stato delle notifiche non è leggibile su questo telefono.',
    nonDeterminato: 'Non determinato',
    statoEtichetta: 'Stato',
    statoAttive: 'Attive',
    statoBloccate: 'Bloccate da Android',
    /** ⚠️ Diceva «Le richieste durano poche ore»: «richiesta» come oggetto. */
    percheContanoTesto: `I ${PAROLE.giri} durano poche ore. Senza notifiche te ne accorgi solo se apri l’app nel momento giusto, e il feed ti sembra quasi sempre vuoto — anche quando la città si sta muovendo.`,

    attiva: 'Attiva le notifiche',
    apriImpostazioni: 'Apri le impostazioni di Android',
    prova: 'Mandami una notifica di prova',

    attivate: 'Notifiche attivate su questo telefono.',
    permessoNegato: 'Permesso negato: puoi concederlo dalle impostazioni di Android.',
    buildSenzaNotifiche: 'Questa versione dell’app non è configurata per le notifiche. Serve una build nuova.',
    nonRegistrato: 'Questo telefono non è stato registrato. Riprova fra poco.',
    provaNonRiuscita: 'Invio non riuscito. Riprova fra poco.',

    /** Cosa arriva davvero, in ordine di quanto conta. */
    elenco: [
      `Qualcuno chiede delle birre nella tua città`,
      `Quando qualcuno accetta il tuo ${PAROLE.giro}`,
      'I messaggi in chat',
      'Quando è il momento di confermare lo scambio',
      `Quando chi hai invitato conclude il suo primo ${PAROLE.giro}`,
    ] as const,
  },

  /** LE NOVITÀ DOPO UN AGGIORNAMENTO. */
  novita: {
    titolo: 'Cos’è cambiato',
    seiAlla: 'Sei alla',
    /**
     * ⚠️ QUESTA FRASE È SPEZZATA IN TRE, E NON PER SCIATTERIA.
     *
     * I due numeri vanno in grassetto DENTRO la frase — è tutto il punto della
     * schermata: distinguere il guscio, che cambia solo reinstallando, dal
     * codice, che arriva da solo. Una voce funzione che restituisce una
     * stringa perderebbe il grassetto; l'unica alternativa sarebbe passare
     * componenti a un testo, che è peggio.
     *
     * Quando si spezza una frase, i pezzi si NOMINANO per la loro posizione,
     * così chi rilegge sa che vanno letti di fila.
     */
    installataInizio: 'L’app che hai installato è la',
    installataMezzo: ', e cambia solo quando ne scarichi una nuova a mano. Il codice dentro è la',
    installataFine: (quando: string | null) =>
      `, e arriva da solo quando riapri l’app${quando ? `: l’ultima volta il ${quando}` : ''}.`,
    dueNumeri: 'I due numeri',
    perSegnalare: 'Se segnali qualcosa che non va, è il secondo numero quello che serve.',
  },

  /** IL PORTAFOGLIO. */
  gettoni: {
    titolo: PAROLE.gettone,
    saldo: 'Saldo',
    impegnati: (quanti: number, disponibili: number) =>
      `${quanti} impegnati in ${PAROLE.giri} aperti · ${disponibili} disponibili`,
    vuotoTitolo: 'Nessun movimento',
    /**
     * ⚠️ I TRE FILTRI DICEVANO «Tutti · Entrate · Uscite».
     *
     * «Entrate» e «Uscite» sono vietate dal glossario, e non per gusto: sono
     * le parole di un estratto conto, cioè di una delle due cose che questo
     * progetto nega di essere. E «Uscite» era anche un omonimo pericoloso —
     * `uscite` è la tabella dell'oggetto centrale della V3, quello di «SONO
     * FUORI». Due significati per la stessa parola dentro la stessa app.
     */
    tutti: 'Tutti',
    presi: 'Presi',
    spesi: 'Spesi',
    vuoto: `I movimenti ${PAROLE.gettone} compaiono qui.`,
    cosaSono: 'Non si comprano, non si trasferiscono, non diventano soldi.',
  },

  /** PARLARE CON CHI SVILUPPA. */
  feedback: {
    /**
     * ⚠️ Il titolo diceva «Aiutaci a migliorare», e il tasto sul profilo
     *    «Dicci cosa non va». Sono due «noi» travestiti da imperativo: «-ci»
     *    è un pronome, e il soggetto che evoca è la stessa società che non
     *    esiste. Qui il destinatario si nomina per quello che è.
     */
    titolo: 'Parla con chi sviluppa',
    campo: 'Messaggio',
    invia: 'Invia',
    occhiello: 'Parla con chi sviluppa',
    dove: 'Ogni messaggio arriva direttamente al pannello di amministrazione.',
    difetto: 'Segnala un difetto',
    idea: 'Proponi un’idea',
    segnaposto: 'Spiega cosa è successo, o cosa miglioreresti',
    inviato: 'Messaggio inviato. Grazie.',
    nonInviato: 'Invio non riuscito. Riprova fra poco.',
  },

  /**
   * LE REGOLE E LA PRIVACY.
   *
   * ⚠️ QUI IL «NOI» NON È UNA QUESTIONE DI STILE.
   *
   * Diceva «Non vendiamo alcolici», «Cosa raccogliamo», «Come li usiamo»,
   * «Non vendiamo dati». In un documento che stabilisce obblighi, un «noi»
   * evoca una società — un soggetto giuridico con dipendenti e un ufficio —
   * che qui non esiste: ci sono due persone e un progetto senza scopo di
   * lucro. Il soggetto si nomina, e diventa `PAROLE.progetto`.
   *
   * ⚠️ E UNA CORREZIONE DI SOSTANZA, NON DI VOCE: l'elenco dei dati pubblici
   *    diceva «rating, recensioni, LIVELLO, BADGE». Livelli e badge non
   *    esistono più — `LEVELS` e `BADGES` sono stati svuotati a mano — quindi
   *    la pagina che promette di dire «chi vede cosa» elencava due dati che
   *    l'app non ha. In un testo del genere è un difetto, non un refuso.
   */
  regole: {
    titoloSchermata: 'Regole e privacy',
    marchio: PAROLE.progetto,
    titolo: 'Le regole, in chiaro',
    intro: `Poche cose, scritte in modo che si capiscano. Se una di queste non ti convince, meglio saperlo adesso che a metà di un ${PAROLE.giro}.`,

    r1Titolo: '1 · Niente vendita di alcolici',
    r1: `${PAROLE.progetto} non compra, non vende e non somministra alcol, e non trattiene commissioni. ${PAROLE.chiPorta.charAt(0).toUpperCase()}${PAROLE.chiPorta.slice(1)} acquista al negozio; lo scambio avviene fra due privati che si accordano fra loro. L’app serve solo a farvi incontrare.`,

    r2Titolo: `2 · I ${PAROLE.gettone} non sono soldi`,
    r2: 'Si guadagnano portando e si spendono chiedendo. Non si comprano, non si trasferiscono, non si convertono in denaro e non danno diritto a rimborsi. Il rimborso della spesa reale avviene direttamente fra voi due, fuori dall’app.',

    r3Titolo: '3 · Solo maggiorenni',
    r3: (anni: number) =>
      `Serve avere almeno ${anni} anni. Dichiarando la tua data di nascita te ne assumi la responsabilità. È vietato chiedere o portare alcolici a minorenni o a chi è palesemente ubriaco.`,

    r4Titolo: '4 · Incontrare sconosciuti',
    r4: `La vibe mode significa incontrare una persona che non conosci. Partecipi con la tua testa e il tuo buon senso. L’indirizzo esatto è visibile solo a chi ha accettato il ${PAROLE.giro}, lo scambio si chiude con un codice o con la conferma di vicinanza, e puoi uscire da un ${PAROLE.giro} in qualsiasi momento senza dare spiegazioni.`,

    r5Titolo: '5 · Come ci si comporta',
    r5: `Niente molestie, insulti, discriminazioni, insistenza o uso commerciale. Chi si comporta male viene sospeso o rimosso. Puoi bloccare chiunque: chi blocchi non vede più i tuoi ${PAROLE.giri} e non può accettarli.`,

    r6Titolo: '6 · Moderazione',
    r6: `Un ${PAROLE.giro} segnalato viene nascosto in attesa di verifica, e chi lo ha lanciato non può pubblicarne di nuovi nel frattempo. Le segnalazioni infondate ripetute sono a loro volta un comportamento scorretto.`,

    r7Titolo: '7 · Responsabilità',
    r7: `Il progetto è offerto così com’è, senza scopo di lucro e senza garanzie. Chi lo mantiene non risponde di ciò che accade fra le persone iscritte, né di danni derivanti dall’uso o dal mancato funzionamento del servizio. Mettersi alla guida dopo aver bevuto è responsabilità esclusiva di chi lo fa.`,

    privacyEtichetta: 'Privacy',
    privacyTitolo: 'Chi vede cosa',

    /** ⚠️ Diceva «Cosa raccogliamo». */
    datiTitolo: 'Quali dati servono',
    dati: `Nome, data di nascita, email e ciò che scegli di aggiungere al profilo (foto, frase, gusti, disponibilità). Per ogni ${PAROLE.giro}: indirizzo, coordinate e messaggi. Se attivi le notifiche, un identificativo del dispositivo. Mentre un ${PAROLE.giro} è in corso, la posizione delle due persone, per permettere la conferma di vicinanza.`,

    chiVedeTitolo: 'Chi vede cosa',
    /** ⚠️ Diceva anche «livello, badge»: due cose che l'app non ha più. */
    chiVede: `Il tuo profilo pubblico — nome, età, foto, frase, recensioni — è visibile alle altre persone iscritte. Le foto della vetrina seguono l’impostazione che scegli tu. L’indirizzo esatto lo vede solo chi ha accettato il tuo ${PAROLE.giro}. Email, data di nascita esatta e saldo ${PAROLE.gettone} non sono mai pubblici.`,

    /** ⚠️ Diceva «Come li usiamo» e «Non vendiamo dati». */
    usoTitolo: 'Come vengono usati',
    uso: `Solo per far funzionare il servizio. ${PAROLE.progetto} non vende dati, non fa pubblicità e non li cede a terzi. Sono ospitati su Supabase. Gli amministratori possono vedere i ${PAROLE.giri} attivi e le segnalazioni per la sicurezza della community, e ogni loro intervento resta tracciato.`,

    cancellazioneTitolo: 'Cancellazione',
    cancellazione: 'Puoi chiedere in qualsiasi momento la cancellazione dell’account e dei tuoi dati a chi gestisce il progetto.',

    nota: 'Versione per la beta chiusa. Viene rivista prima di qualsiasi apertura al pubblico.',
  },

  /**
   * LA SEGNALAZIONE CHE HAI RICEVUTO.
   *
   * ⚠️ È la schermata in cui una persona scopre di essere stata segnalata: si
   *    dice cosa succede adesso, e si dà subito la parola. Nessuna frase può
   *    suonare come una condanna già emessa.
   */
  segnalazione: {
    titolo: 'Hai ricevuto una segnalazione',
    laTuaVersione: 'La tua versione',

    sicurezzaBreve: 'Un problema di sicurezza',
    scambioBreve: 'Un problema durante uno scambio',
    unsafe: (giro: string) => `Qualcuno non si è sentito al sicuro durante un ${giro} con te`,
    assente: 'Qualcuno dice di non averti trovato',
    mismatch: (giro: string) => `Qualcuno dice che il ${giro} non era quello concordato`,

    giaChiusa: ' · già chiusa',
    inEsame: ' · in esame',
    inAttesa: ' · in attesa della tua versione',
    giaValutata: 'Questa segnalazione è già stata valutata. La tua versione resta agli atti.',
    spiegazione:
      'Prima di decidere qualsiasi cosa, chi modera legge tutte e due le versioni. Se pensi si tratti di un errore, questo è il posto per dirlo: scrivi cosa è successo dal tuo punto di vista.',
    segnaposto: 'Cosa è successo, dal tuo punto di vista',
    manda: 'Manda agli amministratori',
    inviata: 'La tua versione è stata inviata.',
    nonInviata: 'Non inviata',

    nonTrovataTitolo: 'Segnalazione non trovata',
    nonTrovataTesto: 'Può essere già stata chiusa, oppure il link non è più valido.',
    tornaIndietro: 'Torna indietro',
  },

  /** LA SCHERMATA INIZIALE. */
  home: {
    cittaNonRisponde: 'La città non risponde. Riprova fra poco.',
    notifiche: (nonLette: number) =>
      nonLette > 0 ? `Notifiche, ${nonLette} non lette` : 'Notifiche',
    radar: 'Radar della serata',
    quantiInZona: (quanti: number, parola: string) => `${quanti} ${parola} in zona`,
    vicinoATe: 'Vicino a te',
    apertiTitolo: `${PAROLE.giri.charAt(0).toUpperCase()}${PAROLE.giri.slice(1)} aperti`,
    mappa: 'Mappa',
    vuotoTitolo: 'Nessuno ha ancora chiesto niente',
    vuotoTesto: (comeFunziona: string) => `Sii tu il primo: ${comeFunziona}`,

    adesso: 'Adesso',
    chiEFuori: 'Chi è fuori',
    fuoriDalFeed: 'Fuori dal feed',
    ciSonoAnchIo: 'Ci sono anch’io',
    sonoFuori: 'Sono fuori',
    chiediUnGiro: `Chiedi un ${PAROLE.giro}`,
    community: 'Incontri e bacheca della tua città.',
    prossimoIncontro: (titolo: string) => `Prossimo incontro: ${titolo}`,
  },

  /** LA MAPPA. */
  mappa: {
    titolo: 'La città, senza rumore',
    /** ⚠️ Diceva «Sto preparando la città»: l'app in prima persona. */
    inCaricamento: 'La città si sta caricando…',
    nonDisponibile: 'La mappa non è disponibile. Controlla la connessione e riprova.',
    negozioInviato: 'Segnalazione inviata. La community lo vede dopo la verifica.',
    negozioNonInviato: 'Segnalazione non inviata. Riprova fra poco.',
    rimuovereNegozio: 'Rimuovere il negozio?',
    rimozioneNonRiuscita: 'Rimozione non riuscita. Riprova fra poco.',
  },

  /** INCONTRI E BACHECA. */
  community: {
    incontriNonCaricati: 'Incontri non caricati',
    bachecaNonCaricata: 'Bacheca non caricata',
    riprovaTirando: 'Controlla la connessione e tira giù per riprovare.',
    incontriVuoti: 'Proponi un posto e un’ora. Il resto lo fa la città.',
    bachecaVuota: 'Quando la città si muove, lo vedi qui.',
    nessunIncontro: 'Nessun incontro',
    bachecaSilenziosa: 'Bacheca silenziosa',
  },

  /** GLI AVVISI DELL'AVVIO. */
  avvio: {
    notificheNonConfigurate:
      'Notifiche non disponibili: questa versione dell’app non è configurata per riceverle.',
    notificheNonAttivate: (dettaglio: string) =>
      `Notifiche non attivate: ${dettaglio}. Vai in Impostazioni → Notifiche per riprovare.`,
    erroreSconosciuto: 'errore sconosciuto',
    /** ⚠️ Diceva «Non sono riuscito a salvare…»: l'app in prima persona. */
    cittaNonSalvata: (citta: string) =>
      `${citta} non è stata salvata come tua città: potresti non ricevere i ${PAROLE.giri} della zona.`,
  },
} as const;
