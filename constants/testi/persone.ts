/**
 * LE PERSONE: profili, amici, incontri, blocchi, e le chat che non nascono da
 * un giro.
 *
 * ⚠️ Regola che vale su tutta l'area, e che qui costa più che altrove: **i
 *    fatti sì, le pagelle no.** Di una persona si dicono cose verificabili —
 *    quanti giri ha concluso, chi l'ha invitata — mai giudizi, mai un numero
 *    da 1 a 5, mai una lode («persona affidabile», «porta più di quanto
 *    chiede»). Una lode è un punteggio scritto a parole, e l'app ne ha già
 *    cancellato uno.
 */
import { PAROLE } from './parole';

export const PERSONE = {
  /**
   * IL TUO PROFILO.
   *
   * ⚠️ Il maiuscolo delle etichette e dei titoli lo mettono `type="label"` e
   *    `type="title"`: qui si scrive in tondo. Erano scritti urlati nel
   *    sorgente in quattro punti, e da lì finivano urlati anche dove il foglio
   *    di stile non arriva.
   */
  profilo: {
    fermoTitolo: 'Profilo fermo',
    /** ⚠️ Diceva «Non riesco a caricare i tuoi dati»: l'app in prima persona. */
    fermoTesto: 'I tuoi dati non sono raggiungibili. Controlla la connessione e riprova.',

    modifica: 'Modifica',
    vetrina: 'Personalizza la vetrina',

    /** Le quattro scorciatoie. */
    amici: 'Amici',
    mieiGiri: `I miei ${PAROLE.giri}`,
    gettoni: PAROLE.gettone,
    impostazioni: 'Impostazioni',

    /** Il portafoglio. */
    tuoiGettoni: `I tuoi ${PAROLE.gettone}`,
    impegnati: (quanti: number, disponibili: number) =>
      `${quanti} impegnati in ${PAROLE.giri} aperti · ${disponibili} disponibili`,
    comeSiGuadagnano: 'Si guadagnano contribuendo. Non si comprano. Non si trasferiscono.',

    /** L'invito ha una card sua: è il modo in cui la community cresce. */
    invitoEtichetta: 'Si entra solo su invito',
    invitoTitolo: 'Il tuo invito',
    invitoTesto: 'Ne hai uno. Quando lo usi è speso: scegli bene chi porti dentro.',

    /**
     * LA RECIPROCITÀ.
     * ⚠️ Non è un punteggio, e la frase sotto esiste per dirlo: due conteggi
     *    neutri, mai una lode e mai il suo gemello negativo.
     */
    reciprocitaEtichetta: 'Reciprocità',
    reciprocitaTitolo: 'Dai / ricevi',
    haiPortato: 'Hai portato',
    haiRicevuto: 'Hai ricevuto',
    reciprocitaNota: 'Non è una gara. È il modo più semplice per capire come stai partecipando.',

    settimanaEtichetta: 'Questa settimana',
    missioniTitolo: 'Missioni urbane',
    missioniVuoteTitolo: 'Missioni in arrivo',
    missioniVuoteTesto: 'La città sta preparando i prossimi obiettivi.',
    missioneProgresso: (fatti: number, totale: number, premio: number) =>
      `${fatti} / ${totale} · ${premio} ${PAROLE.gettoneBreve}`,
    missioneAccreditata: 'Accreditata',
    missioneInAccredito: 'In accredito',

    obiettivoEtichetta: (citta: string) => `Obiettivo di ${citta}`,
    obiettivoTitolo: (fatti: number, totale: number) => `${fatti} ${PAROLE.giri} su ${totale}`,
    obiettivoNota: `Ogni ${PAROLE.giro} confermato muove tutta la città.`,

    movimentiEtichetta: PAROLE.gettone,
    movimentiTitolo: 'Ultimi movimenti',
    nessunMovimento: 'Nessun movimento.',

    fiduciaEtichetta: 'Fiducia',
    recensioniTitolo: 'Recensioni',
    nessunaRecensione: `Le recensioni arrivano dopo i ${PAROLE.giri} confermati.`,

    amministrazione: 'Amministrazione',
    /** ⚠️ Diceva «Migliora BeerToBeer», attaccato: non è il nome del marchio. */
    migliora: (progetto: string) => `Migliora ${progetto}`,
    migliorNota: 'Segnala un difetto o proponi una funzione direttamente a chi sviluppa.',
    inviaFeedback: 'Dicci cosa non va',
  },

  /**
   * IL PROFILO DI QUALCUN ALTRO.
   *
   * ⚠️ Diceva «Segnala utente» e «Utente non trovato». «Utente» è vietato dal
   *    glossario: i ruoli sono `chi chiede` e `chi porta`, e una persona che
   *    non sta facendo né l'uno né l'altro è semplicemente una persona.
   */
  altrui: {
    nonTrovatoTitolo: 'Persona non trovata',
    nonTrovatoTesto: 'Il profilo non è raggiungibile, oppure non esiste più.',
    segnala: 'Segnala',
    segnalaTitolo: 'Segnala questa persona',
    segnalataInviata: 'Segnalazione inviata, grazie.',
    segnalataNonInviata: 'Segnalazione non inviata. Riprova fra poco.',

    sieteAmici: 'Siete amici',
    oraAmici: 'Ora siete amici.',
    nonPiuAmici: 'Non siete più amici.',
    nonRiuscitaTitolo: 'Non riuscita',

    preferenzeBirra: 'Preferenze birra',
    nessunaRecensioneTitolo: 'Nessuna recensione',
    nessunaRecensioneTesto: `Le recensioni degli scambi conclusi compaiono qui.`,

    /** Le azioni verso una persona. */
    scrivi: 'Scrivi',
    richiestaInviata: 'Richiesta inviata',
    accetta: 'Accetta',
    aggiungi: 'Aggiungi',
    richiestaMandata: 'Richiesta inviata.',
    /** ⚠️ Dicevano «Segnala utente» e «Blocca utente». */
    blocca: 'Blocca',
    sblocca: 'Sblocca',

    /**
     * I TRE NUMERI DELLA CARD.
     *
     * ⚠️ Due di questi hanno già una condanna scritta nel piano, e restano qui
     *    solo perché sono voci a sé che vanno fatte tutte insieme:
     *    · «Rating» è la media da 1 a 5 — **D5** la toglie dai profili altrui.
     *      Qui è già sparita l'emoji ⭐ che le stava accanto, che era una
     *      violazione a parte: un glifo glossy multicolore disegnato da altri.
     *    · «Karma» è la reciprocità espressa male — **E2** la rinomina e la
     *      mostra come rapporto invece che come differenza, perché un numero
     *      NEGATIVO accanto a un nome è un marchio.
     */
    voceRating: 'Rating',
    voceGiri: `${PAROLE.giri.charAt(0).toUpperCase()}${PAROLE.giri.slice(1)}`,
    voceKarma: 'Karma',
  },

  /** GLI AMICI. */
  amici: {
    titolo: 'I miei amici',
    nonCaricatoTitolo: 'Non caricato',
    vuotoTitolo: 'Ancora nessun amico',
    vuotoTesto: 'Aggiungi qualcuno dal suo profilo: si aggiunge quando accetta.',
    /** ⚠️ Il maiuscolo lo mette `type="label"`. */
    richiesteInArrivo: 'Ti hanno chiesto l’amicizia',
    giaConosciute: 'Queste le conosci già',
    giaConosciuteNota: `Ci hai già fatto almeno un ${PAROLE.giro}.`,
    /**
     * ⚠️ Il singolare non è un dettaglio: la schermata diceva già «1 giro
     *    insieme», e portando la frase qui dentro senza il ramo si sarebbe
     *    letto «1 giri insieme». È il modo tipico in cui una migrazione di
     *    stringhe peggiora un testo mentre lo «sistema».
     */
    giriInsieme: (quanti: number) =>
      quanti === 1 ? `1 ${PAROLE.giro} insieme` : `${quanti} ${PAROLE.giri} insieme`,
    oraAmico: (nome: string) => `Ora sei amico di ${nome}.`,
    richiestaRifiutata: 'Richiesta rifiutata.',
    nonRiuscitaTitolo: 'Non riuscita',
  },

  /**
   * LE PERSONE BLOCCATE.
   *
   * ⚠️ Questa schermata non è un abbellimento: prima `blockUser` si
   *    raggiungeva solo dal profilo di qualcuno, quindi **se bloccavi una
   *    persona e non ritrovavi il suo profilo il blocco era irreversibile
   *    dall'app**. «Senza consumatori» a volte significa «manca la schermata».
   */
  bloccati: {
    titolo: 'Persone bloccate',
    nonDisponibile: 'Elenco non disponibile',
    reteKo: 'Controlla la rete e riprova.',
    vuotoTitolo: 'Non hai bloccato nessuno',
    vuotoTesto:
      'Se una persona ti mette a disagio puoi bloccarla dal suo profilo: sparite dal feed a vicenda e non potete più scrivervi.',
    tornaIndietro: 'Torna indietro',
    senzaNome: 'questa persona',
    nonPiuEsistente: 'Persona non più esistente',
    cosaComporta:
      'Non vi vedete nel feed, non potete scrivervi, e nessuna delle due cose le è stata detta.',
    /** ⚠️ «Non riceve nessun avviso» è la parte che conta: sbloccare è silenzioso. */
    sblocchiTitolo: (nome: string) => `Sblocchi ${nome}?`,
    restaBloccata: 'Resta bloccata',
    sbloccaConferma:
      'Tornerete a vedervi nel feed e potrete di nuovo scrivervi. Non riceve nessun avviso.',
    sbloccata: (nome: string) => `${nome} non è più bloccata.`,
    nonSbloccata: 'Non sbloccata',
  },

  /** MODIFICARE IL PROPRIO PROFILO. */
  modifica: {
    titolo: 'Modifica profilo',
    tornaIndietro: 'Torna indietro',
    nomeEtichetta: 'Nome',
    nome: 'Il tuo nome',
    preferenze: 'Preferenze birra',
    preferenzeSegnaposto: 'Es. IPA, birre artigianali',
    cercoCompagniaTitolo: 'Cerco compagnia',
    /**
     * ⚠️ Diceva «nella tua zona», e il filtro e' PER CITTA'.
     *
     * Non e' pignoleria: e' una promessa che l'app non puo' mantenere.
     * `getPeopleInCity` filtra per citta', e la zona la conosce solo di chi ha
     * un'uscita aperta — cioe' di chi ha dato le coordinate volontariamente.
     * Il piano lo dice esplicito: **l'app non promette una cosa che non sa.**
     */
    cercoCompagnia: 'Fatti trovare da chi vuole bere una birra in compagnia nella tua città.',
    salva: 'Salva le modifiche',

    fotoNonCaricataTitolo: 'Foto non caricata',
    fotoNonCaricataTesto: 'La foto non è stata caricata. Riprova fra poco.',
    nomeVuoto: 'Il nome non può essere vuoto.',
    nonSalvato: 'Salvataggio non riuscito. Riprova fra poco.',
    profiloNonCaricato: 'Profilo non raggiungibile. Controlla la connessione e riprova.',
  },

  /**
   * LA VETRINA DEL PROFILO.
   *
   * ⚠️ Il titolo dice già la regola: «senza esagerare». Tre sticker al
   *    massimo, quattro foto. Un profilo che si può decorare all'infinito
   *    diventa una gara, e questa app ha già cancellato badge e livelli
   *    proprio per non averne una.
   */
  vetrina: {
    titolo: 'La tua vetrina',
    occhiello: 'Il tuo profilo, senza esagerare',
    nonDisponibile: 'Profilo non disponibile',
    migrazioneMancante: 'Aggiorna prima il database con la migrazione del profilo.',

    frase: 'Frase del profilo',
    fraseSegnaposto: 'Es. Una birra e due chiacchiere',
    quandoCiSei: 'Quando ci sei',
    /** Le due fasce predefinite. */
    dopoLavoro: 'Dopo lavoro',
    giroLampo: 'Giro lampo',

    foto: 'Fino a quattro foto. La prima diventa anche la foto principale.',
    fotoRimuovi: 'Tieni premuta una foto per rimuoverla.',
    rimuoverePhotoTitolo: 'Rimuovere la foto?',
    rimuoverePhotoTesto: 'La foto viene eliminata.',
    fotoNonCaricata: 'Foto non caricata',
    connessioneKo: 'Controlla la connessione e riprova.',

    troppiSticker: 'Puoi tenere al massimo tre sticker. Togline uno per farne entrare un altro.',
    piuPiccolo: 'Più piccolo',
    piuGrande: 'Più grande',

    /** Sezioni. Il maiuscolo lo mette `type="label"`. */
    sezioneFoto: 'Foto',
    sezioneGusti: 'Gusti',
    sezionePrivacy: 'Privacy foto',
    sezioneAnteprima: 'Anteprima poster',
    fotoNumero: (n: number) => `Foto ${n}`,

    /** Le quattro fasce. */
    fasce: ['Dopo lavoro', 'Sera', 'Weekend', 'Giro lampo'] as const,

    /** Chi vede le tue foto. ⚠️ Diceva «Solo connessioni»: qui si dice amici. */
    privacyTutti: 'Tutti',
    privacyAmici: 'Solo amici',
    privacyNascoste: 'Nascoste',

    vetrinaPiena: 'Vetrina piena',
    rimuovi: 'Rimuovi',
    dimensione: (scala: number, gradi: number) =>
      `Dimensione ${scala}% · rotazione ${gradi}°`,
    ruotaAvanti: 'Ruota a destra',
    ruotaIndietro: 'Ruota a sinistra',
    condividi: 'Condividi il mio profilo',
    /**
     * ⚠️ Voce funzione, e il nome del progetto arriva da `PAROLE`: diceva
     *    «su BeerToBeer», attaccato, che non è il nome del marchio.
     */
    condivisione: (nome: string, frase: string, gusti: string) =>
      [`${nome} su ${PAROLE.progetto}`, frase, gusti].filter(Boolean).join('\n'),
    fraseDiRiserva: 'Una community, una città, un giro alla volta.',

    salva: 'Salva la vetrina',
    nonSalvataTitolo: 'Salvataggio non riuscito',
    nonSalvataTesto: 'Riprova fra un momento.',
  },

  /**
   * LE DUE CHAT CHE NON NASCONO DA UN GIRO.
   *
   * Quella diretta fra due persone che si sono già incontrate, e quella di
   * gruppo di un incontro. La chat di un giro sta in `GIRO.chat`, con il resto
   * del giro: sono contesti diversi, e mettere insieme tutte le chat perché
   * «sono chat» sarebbe ordinare per componente invece che per significato.
   */
  chat: {
    /**
     * ⚠️ Aveva un punto esclamativo — «vi siete conosciuti con uno scambio!» —
     *    che nel copy è vietato: l'unico strumento di volume è il maiuscolo in
     *    Bebas, che lo mette il foglio di stile.
     */
    direttaVuota: (nome: string) => `Scrivi a ${nome}: vi siete conosciuti con uno scambio.`,
    direttaVuotaSenzaNome: 'Scrivi: vi siete conosciuti con uno scambio.',
    direttaNonCaricata: 'Conversazione non raggiungibile. Controlla la connessione e riprova.',

    gruppoTitolo: 'Chat del gruppo',
    gruppoNonDisponibile: 'Chat non disponibile.',
    gruppoVuota: 'Ancora nessun messaggio. Mettetevi d’accordo su chi porta cosa.',
    /** ⚠️ «Ci sono!» aveva il punto esclamativo. */
    gruppoRapide: ['Ci sono', 'Arrivo con dieci minuti di ritardo', 'Che porto?', 'Dove ci troviamo di preciso?'] as const,
  },
} as const;
