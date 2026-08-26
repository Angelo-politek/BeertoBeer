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

  /**
   * LANCIARE UN GIRO.
   *
   * ⚠️ Questa schermata era la più fuori glossario dell'app: diceva «driver»,
   *    «crediti», «richiesta» come oggetto, «chi consegna», e in un avviso
   *    parlava in prima persona («Non riesco a posizionare…»). Sono cinque
   *    parole vietate in una schermata sola, e non è un caso: è la più vecchia.
   */
  lancia: {
    /** Le sezioni. Il maiuscolo lo mette `type="label"`. */
    cosa: 'Cosa ti serve',
    dove: 'Dove portarle',
    quando: 'Quando',
    costo: `${PAROLE.gettone} del ${PAROLE.giro}`,

    birraSegnaposto: 'Tipo di birra (es. Ichnusa)',
    quantitaSegnaposto: 'Qtà',
    aggiungiBirra: 'Aggiungi un’altra birra',

    /** Le quattro fasce. Sono testo letto, non chiavi: stanno qui. */
    fasce: ['Adesso', 'Tra un’ora', 'Stasera', 'Domani'] as const,

    indirizzo: (citta: string) => `Indirizzo a ${citta}`,
    mappaTitolo: 'Tocca il punto della consegna',
    mappaAiuto: (citta: string) => `${citta} — sposta e zooma la mappa, poi tocca dove portarle.`,
    /** Cosa manca per pubblicare, detto mentre si scrive. */
    mancaBirra: 'almeno una birra',
    mancaIndirizzo: 'l’indirizzo dove portarle',
    mancaConfermaMappa: 'la conferma dell’indirizzo sulla mappa',
    manca: (cose: string) => `Per pubblicare manca ancora: ${cose}.`,

    /** ⚠️ Voci funzione: i numeri vengono da `lib/limiti.ts` e `lib/credits.ts`. */
    troppeBirre: (chieste: number, massimo: number) =>
      `${chieste} birre sono troppe: il massimo per un ${PAROLE.giro} è ${massimo}. Oltre non è più un favore fra vicini.`,
    rigaSenzaNome: 'Una riga è senza nome e non verrà pubblicata.',
    righeSenzaNome: (quante: number) => `${quante} righe sono senza nome e non verranno pubblicate.`,

    quanto: (bc: number) => `${bc} ${PAROLE.gettone}`,
    daPeso: 'Calcolati dal peso delle birre.',
    /** ⚠️ Diceva «Quando un driver accetta»: la parola vietata più vistosa. */
    bonusDistanza: (massimoBonus: number, tetto: number) =>
      ` Quando ${PAROLE.chiPorta} accetta si aggiunge un bonus in base alla sua distanza (fino a +${massimoBonus}, massimo ${tetto} in tutto).`,
    /** ⚠️ Diceva «crediti per consegna»: due parole vietate in tre parole. */
    giaAlMassimo: (tetto: number) => ` Sei già al massimo di ${tetto} ${PAROLE.gettone} per ${PAROLE.giro}.`,
    disponibili: (bc: number) => ` Ne hai ${bc} disponibili.`,
    nonCopribile: `Non hai abbastanza ${PAROLE.gettone} disponibili: gli altri sono impegnati in ${PAROLE.giri} ancora aperti.`,

    vibeTitolo: 'Vibe mode',
    /** ⚠️ Diceva «chi consegna». */
    vibeTesto: `Invita ${PAROLE.chiPorta} a fermarsi a bere insieme.`,

    pubblica: `Pubblica il ${PAROLE.giro}`,

    /** Chi è sospeso lo scopre qui, prima di compilare tutto per niente. */
    sospesoTitolo: 'Account temporaneamente sospeso',
    /** ⚠️ Diceva «Una tua richiesta»: «richiesta» come oggetto è vietato. */
    sospesoTesto: (quando: string) =>
      `Un tuo ${PAROLE.giro} è stato segnalato ed è in verifica. Potrai pubblicare di nuovo dal ${quando}, o prima se la moderazione lo approva.`,

    /** Da un'uscita: si dice subito che il giro NON è riservato. */
    rispondiA: 'Stai rispondendo a',
    /**
     * ⚠️ La frase si compone QUI, non nella schermata. Prima la schermata
     *    incollava insieme forma, zona e orario con due template annidati: la
     *    frase risultante non esisteva in nessun file, e nessuno poteva
     *    rileggerla per accorgersi di com'era venuta.
     */
    rispondiANota: (forma: string, zona: string | null | undefined, fino: string) =>
      `${forma.toLowerCase()}${zona ? ` a ${zona}` : ''}, ${fino}. Riceve un avviso, ma il ${PAROLE.giro} resta aperto a tutti: chi passa per primo lo prende.`,

    /** Gli avvisi bloccanti. */
    mancaTitolo: 'Manca qualcosa',
    mancaBirraAvviso: 'Indica almeno una birra.',
    mancaIndirizzoAvviso: 'Indica dove portarle.',

    /**
     * ⚠️ Diceva «Non riesco a posizionare…»: l'app in prima persona. Se l'app
     *    dice «non riesco» diventa un personaggio, e un personaggio che ti
     *    assiste è la mascotte da startup che il marchio vieta. Qui il soggetto
     *    è l'indirizzo, che è anche la cosa da sistemare.
     */
    indirizzoTitolo: 'Indirizzo da confermare',
    indirizzoTesto: (indirizzo: string, citta: string) =>
      `«${indirizzo}» non risulta dentro ${citta}. Usa «Usa la mia posizione», oppure scegli il punto sulla mappa: senza il punto esatto ${PAROLE.chiPorta} non saprebbe dove andare.`,

    /** ⚠️ Diceva «Crediti insufficienti» e «Questa richiesta costa». */
    saldoTitolo: `${PAROLE.gettone} non sufficienti`,
    saldoTesto: (costo: number, disponibili: number) =>
      `Questo ${PAROLE.giro} costa ${costo} ${PAROLE.gettone} e ne hai ${disponibili} disponibili. Gli altri sono impegnati in ${PAROLE.giri} ancora aperti: chiudili, guadagnane portando, oppure chiedi meno birre.`,

    nonPubblicatoTitolo: 'Non pubblicato',
    nonPubblicatoTesto: `Il ${PAROLE.giro} non è stato pubblicato. Riprova fra poco.`,
  },

  /**
   * I TRE ORDINAMENTI, e i filtri del feed.
   *
   * ⚠️ «Più vicini» era scritto «Piu vicini», SENZA ACCENTO — ed è uno dei tre
   *    nomi ufficiali del glossario. Un termine di glossario scritto male è
   *    peggio di una frase qualsiasi scritta male: è quello che tutti gli
   *    altri testi devono copiare.
   *
   * ⚠️ E qui NON deve mai ricomparire «Per te»: era il nome di `smartScore`,
   *    cioè la parola delle piattaforme che questo progetto dice di rifiutare.
   */
  ordina: {
    scadenza: 'Chi finisce prima',
    distanza: 'Più vicini',
    recenti: 'Appena arrivati',
  },
  filtri: {
    tutti: 'Tutti',
    adesso: 'Adesso',
    stasera: 'Stasera',
    vibe: 'Vibe mode',
    entroKm: (km: number) => `Entro ${km} km`,
  },

  /** La card di un giro nel feed. */
  card: {
    vibe: 'Vibe mode',
    vedi: `Vedi il ${PAROLE.giro}`,
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
   * IL DETTAGLIO DI UN GIRO — la schermata più grossa dell'app.
   *
   * ⚠️ Era anche la più fuori glossario, e non per caso: è cresciuta a strati.
   *    Diceva «host», «consegna» come oggetto, «richiesta», «crediti»; parlava
   *    in prima persona («Non riesco a inviare la tua posizione», «Preparo il
   *    link»); diceva «Verifichiamo» al plurale maiestatis; aveva un punto
   *    esclamativo («Buona birra!») e tre parole senza accento nella banda che
   *    compare quando un giro è fermo — cioè nel punto in cui una persona è
   *    già preoccupata.
   */
  dettaglio: {
    titolo: (giro: string) => `Dettaglio del ${giro}`,
    prossimaAzione: 'Prossima azione',

    /** Il giro non esiste più, o non è per te. */
    scadutoTitolo: `${PAROLE.giro.charAt(0).toUpperCase()}${PAROLE.giro.slice(1)} scaduto o non disponibile`,
    scadutoTesto: (ore: number) =>
      `Può essere già stato accettato, scaduto dopo ${ore} ore, oppure rimosso. Torna al feed per vedere quelli aperti.`,
    tornaAlFeed: 'Torna al feed',

    /**
     * ⚠️ La banda del giro fermo aveva tre parole senza accento — «Finche»,
     *    «cosi», «puo» — proprio dove chi legge è già in ansia.
     */
    fermoTesto: 'Finché resta così non si può fare niente su questo giro. Se pensi sia un errore, scrivilo dal profilo: lo legge chi modera.',

    segnala: 'Segnala',
    /** ⚠️ Diceva «Segnala richiesta». */
    segnalaGiro: `Segnala il ${PAROLE.giro}`,
    segnalataInviata: `Segnalazione inviata: il ${PAROLE.giro} è in verifica`,
    segnalataNonInviata: 'Segnalazione non inviata: forse l’avevi già mandata.',

    /** Le due persone. */
    portaLeBirre: 'Porta le birre',
    /** ⚠️ Voci funzione: età, giri e distanza sono numeri, e arrivano da fuori. */
    fattiPersona: (anni: number, giri: number) => `${anni} anni · ${giri} ${PAROLE.giri}`,
    distanza: (km: string) => `~${km} km da te`,
    quando: (fascia: string) => `Quando: ${fascia}`,

    vibeTitolo: 'Vibe mode attiva',
    vibeTesto: (nome: string) =>
      `${nome} ti invita a fermarti a bere insieme una volta portate le birre. È sempre facoltativo: puoi anche lasciarle e andare via.`,

    /** Quanto manca, dal punto di vista di chi porta. */
    quantoManca: 'Quanto manca?',
    minuti: (n: number) => `${n} min`,
    arrivoStimato: (n: number) => `Arrivo stimato: ${n} minuti.`,
    sonoInRitardo: 'Sono in ritardo',
    devoFermare: `Devo fermare il ${PAROLE.giro}`,

    statoDelGiro: `Stato del ${PAROLE.giro}`,

    /** ⚠️ Si chiamava «Codice di consegna»: «consegna» è la parola del delivery. */
    codiceTitolo: `Codice del ${PAROLE.giro}`,
    codiceNota: `Comunicalo solo quando ${PAROLE.chiPorta} è davanti a te.`,
    codiceTentativi: (rimasti: number) => `Tentativi disponibili: ${rimasti}. Il codice scade da solo.`,
    codiceNuovo: 'Genera un codice nuovo',
    codicePronto: 'Codice nuovo pronto.',

    birre: 'Birre chieste',

    /** ⚠️ La sezione si chiamava «Consegna». */
    dove: 'Dove portarle',
    indirizzoDopo: 'Indirizzo esatto visibile dopo l’accettazione.',
    mappaApprossimativa: 'La mappa mostra la zona approssimativa: l’indirizzo esatto dopo l’accettazione.',

    /** ⚠️ Diceva «crediti» due volte, e «Credito chiuso». */
    bonusSeAccetti: (bonus: number, tetto: number) =>
      `Se accetti tu si aggiunge un bonus distanza di circa ${bonus} ${PAROLE.gettone} (massimo ${tetto} in tutto).`,
    bonusQuandoAccetti: (tetto: number) =>
      `Quando accetti si aggiunge un bonus in base alla tua distanza (massimo ${tetto} in tutto).`,
    monetaChiusa: `I ${PAROLE.gettone} non si comprano, non si trasferiscono e non diventano soldi.`,

    /** Le azioni, per stato e per ruolo. */
    annullaGiro: `Annulla il ${PAROLE.giro}`,
    /** ⚠️ Diceva «Accetta consegna» e «Inizia consegna». */
    accetta: `Porta tu questo ${PAROLE.giro}`,
    parti: 'Parti',
    libera: 'Ho cambiato idea: libera',
    haAccettato: (nome: string) => `${nome} ha accettato e si sta organizzando.`,
    sonoArrivato: 'Sono arrivato',
    birraInArrivo: 'La birra è in arrivo.',
    apriChat: 'Apri la chat',
    lasciaRecensione: 'Lascia una recensione',
    /** ⚠️ Diceva «Crediti trasferiti». */
    completato: `Scambio completato. ${PAROLE.gettone} trasferiti.`,

    /** La stretta di mano: due tocchi, o il codice. */
    sieteInsieme: 'Siete insieme?',
    /** ⚠️ Diceva «Verifichiamo»: un «noi» che evoca una società. */
    unTocco: 'Un tocco a testa: si controlla solo che i telefoni siano vicini.',
    confermaScambio: 'Conferma lo scambio',
    posizioneNonVa: 'La posizione non funziona',
    confermaRegistrata: 'La tua conferma è registrata',
    mancaAltro: 'Manca solo l’altra persona. La pagina si aggiorna da sola.',
    verificaDiNuovo: 'Verifica di nuovo',
    /** ⚠️ Diceva «Chiedi il codice all'host». Meglio il nome vero della persona. */
    chiediCodice: (nome: string) => `Chiedi il codice a ${nome}`,
    confermaConCodice: 'Conferma con il codice',
    comunicaCodice: `${PAROLE.chiPorta.charAt(0).toUpperCase()}${PAROLE.chiPorta.slice(1)} è arrivato. Comunica il codice solo quando siete insieme.`,
    inAttesaAltro: 'In attesa della conferma dell’altra persona.',
    /** ⚠️ Aveva un punto esclamativo, che nel copy è vietato. */
    scambioFatto: 'Scambio confermato. Buona birra.',
    confermatoMancaAltro: 'Confermato. Manca solo l’altra persona.',

    /** Annullare, liberare, fermarsi. */
    annulliTitolo: `Annulli il ${PAROLE.giro}?`,
    annulliTesto: `Sparisce dal feed e i ${PAROLE.gettone} impegnati tornano tuoi. Nessuna penalità.`,
    lascioAperto: 'Lascio aperto',
    liberaTitolo: `Liberare il ${PAROLE.giro}?`,
    /** ⚠️ Diceva «La richiesta tornerà disponibile». */
    liberaTesto: `Il ${PAROLE.giro} torna disponibile e non ci sono penalità.`,
    restaNelGiro: `Resta nel ${PAROLE.giro}`,
    liberaConferma: 'Libera',
    fermartiTitolo: 'Perché devi fermarti?',
    fermartiTesto: 'Dopo la partenza il motivo viene registrato per sicurezza.',
    emergenza: 'Emergenza',
    guasto: 'Guasto o incidente',
    nonSicuro: 'Non è sicuro',

    /** Perché annulli, quando qualcuno ha già accettato. */
    percheAnnulliTitolo: 'Perché annulli?',
    percheAnnulliTesto: (nome: string) =>
      `${nome} ha già accettato e potrebbe essere già uscito. Due parole bastano: le legge solo lui.`,
    percheAnnulliSegnaposto: 'Es. mi si sono presentati degli amici con le birre',

    /** Il link pubblico da far seguire a qualcuno. */
    /** ⚠️ Diceva «Preparo il link…»: l'app in prima persona. */
    linkInCorso: 'Link in preparazione…',
    faiSeguire: (giro: string) => `Fai seguire il ${giro} a qualcuno`,
    linkChiPorta: (ore: number) =>
      `Si apre da qualsiasi telefono, anche senza app. Mostra dove sei e a che punto è il ${PAROLE.giro}. Scade dopo ${ore} ore.`,
    linkChiChiede: `Si apre da qualsiasi telefono, anche senza app. Mostra a che punto è il ${PAROLE.giro}, mai il tuo indirizzo. La posizione di ${PAROLE.chiPorta} può condividerla solo lui.`,
    linkMessaggio: (link: string) =>
      `Sto facendo un ${PAROLE.giro} su ${PAROLE.progetto}. Puoi seguirlo qui, si apre anche senza l’app: ${link}`,
    linkNonCreato: 'Link non creato',

    /** I pulsanti dei guai. */
    seQualcosaNonVa: 'Se qualcosa non va',
    nonTrovoPersona: 'Non trovo la persona',
    nonEIlGiro: `Non è il ${PAROLE.giro} concordato`,
    nonMiSentoAlSicuro: 'Non mi sento al sicuro',
    chiudiBloccato: `Chiudi il ${PAROLE.giro} bloccato`,
    guaiPiuTardi: 'Quando qualcuno accetta, qui compaiono i modi per segnalare un problema.',
    guaiNota: `Le ultime due arrivano agli amministratori. «Non mi sento al sicuro» ferma subito il ${PAROLE.giro}.`,

    /** Cosa succede davvero dopo una segnalazione. */
    fermatoAvvisati: `${PAROLE.giro.charAt(0).toUpperCase()}${PAROLE.giro.slice(1)} fermato. Gli amministratori sono stati avvisati.`,
    inviataAgliAdmin: 'Segnalazione inviata agli amministratori.',
    altroLoSa: 'L’altra persona lo sa.',
    /** ⚠️ Diceva «Non riesco a inviare la tua posizione»: l'app in prima persona. */
    posizioneNonParte: `La posizione non parte: usate il codice del ${PAROLE.giro}.`,

    /** Le due segnalazioni che chiedono due righe di contesto. */
    cosaSuccedeTitolo: 'Cosa sta succedendo?',
    cosaNonTornaTitolo: 'Cosa non torna?',
    unsafeSpiegazione: `Il ${PAROLE.giro} viene fermato subito e la segnalazione arriva agli amministratori. Scrivi cosa sta succedendo: senza sapere cosa è successo non possono aiutarti davvero. Se sei in pericolo immediato chiama il 112.`,
    mismatchSpiegazione: 'La segnalazione arriva agli amministratori, e l’altra persona potrà dare la sua versione. Scrivi cosa era stato concordato e cosa è arrivato.',
    unsafeSegnaposto: 'Es. non se ne va da davanti al portone',
    mismatchSegnaposto: 'Es. avevo chiesto sei birre, ne sono arrivate due',
    fermaIlGiro: `Ferma il ${PAROLE.giro}`,

    /** Il registro di cosa è successo, in fondo alla timeline. */
    evento: {
      accepted: `${PAROLE.giro.charAt(0).toUpperCase()}${PAROLE.giro.slice(1)} accettato`,
      started: 'Partenza o arrivo stimato aggiornato',
      arrived: 'Arrivo registrato',
      code_failed: 'Codice non valido',
      code_verified: 'Codice verificato',
      exited: `Uscita dal ${PAROLE.giro}`,
      shared: 'Stato condiviso',
      reported: 'Imprevisto registrato',
      completed: `${PAROLE.giro.charAt(0).toUpperCase()}${PAROLE.giro.slice(1)} completato`,
    },

    nonRiuscita: 'Operazione non riuscita. Riprova.',
  },

  /**
   * LA CHAT DI UN GIRO.
   *
   * Le risposte rapide non sono un vezzo: si scrive con una mano sola, per
   * strada, spesso al buio. Sono le quattro frasi che si mandano davvero.
   */
  chat: {
    titolo: `Chat del ${PAROLE.giro}`,
    nonCaricata: 'Chat non raggiungibile. Controlla la connessione e riprova.',
    vuota: `Usa la chat solo per mettervi d’accordo sul ${PAROLE.giro}.`,
    rapide: ['Parto ora', 'Arrivo tra dieci minuti', 'Sono sotto', 'Ho un ritardo'] as const,
    /** ⚠️ Il maiuscolo lo mette `type="label"`: qui si scrive in tondo. */
    intestazione: (stato: string) => `${PAROLE.giro} ${stato.toLowerCase()}`,
    fasciaNonIndicata: 'Orario non indicato',
    arrivoStimato: (minuti: number) => ` · arrivo fra ${minuti} min`,

    /** Briciole condivise da tutte e tre le chat. */
    nonInviato: 'Messaggio non inviato. Riprova.',
    nessunMessaggio: 'Nessun messaggio',
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
