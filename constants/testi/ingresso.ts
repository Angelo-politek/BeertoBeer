import type { BrandIconName } from '@/components/ui/brand-icon';

import { PAROLE } from './parole';

export type SlideOnboarding = { icon: BrandIconName; titolo: string; testo: string };

/**
 * LA SOGLIA: accesso, registrazione, recupero della password, conferma email.
 *
 * È il testo che una persona legge PRIMA di essere dentro, cioè quando non ha
 * ancora nessun motivo per darti fiducia. Due conseguenze pratiche:
 *
 * - QUI NON SI SCHERZA MAI. L'ironia sta nella scelta della parola, e comunque
 *   mai dentro un errore: chi non riesce a entrare non vuole compagnia, vuole
 *   sapere cosa fare.
 * - OGNI ERRORE DEVE DIRE DI CHI È IL PROBLEMA. Se è tuo (email già usata,
 *   invito sbagliato) si dice come si sistema; se è del servizio, si dice che
 *   è del servizio. `lib/auth-errors.ts` esiste per questo.
 *
 * ⚠️ NIENTE «NOI» E NIENTE «IO». Il soggetto è `PAROLE.progetto`, nominato.
 *    «Non siamo riusciti ad aggiornare la password» faceva apparire una
 *    società che qui non esiste; «Sto confermando il tuo account» faceva
 *    dell'app un personaggio, che è la mascotte da startup che il marchio
 *    vieta. Erano entrambe vive su questa soglia.
 */
export const INGRESSO = {
  accesso: {
    /** La riga del marchio: dice perché sei qui, non cosa devi premere. */
    claim: 'Ti manca una birra? Qualcuno è già in strada.',
    email: 'Email',
    emailSegnaposto: 'tu@esempio.it',
    password: 'Password',
    passwordSegnaposto: '••••••••',
    entra: 'Accedi',
    dimenticata: 'Password dimenticata?',
    /** Il piede: una domanda e la porta accanto. */
    senzaAccount: 'Non hai un account?',
    registrati: 'Registrati',
    /** Prima di chiamare il server: manca proprio qualcosa da mandare. */
    campiVuoti: 'Scrivi email e password.',
  },

  registrazione: {
    occhiello: 'Bastano trenta secondi',
    titolo: 'Crea il tuo account',
    /**
     * ⚠️ Voce funzione, non stringa: l'età minima sta in `lib/age.ts`
     *    (`ETA_MINIMA`). Scritta a mano qui, il giorno che cambia mente.
     */
    eta: (anni: number) => `Devi avere almeno ${anni} anni: qui si parla di alcolici.`,
    nome: 'Nome',
    nomeSegnaposto: 'Come ti chiami?',
    email: 'Email',
    emailSegnaposto: 'tu@esempio.it',
    password: 'Password',
    passwordSegnaposto: (caratteri: number) => `Almeno ${caratteri} caratteri`,
    crea: 'Registrati',
    haiAccount: 'Hai già un account?',
    accedi: 'Accedi',

    /** Il campo dell'invito, e le tre cose che può dire sotto. */
    invito: {
      etichetta: 'Codice di invito',
      segnaposto: 'Es. ABCD-2345',
      /** Stato neutro: si spiega la regola del mondo, non si rimprovera. */
      comeFunziona: `Si entra solo su ${PAROLE.invito}: fattelo dare da chi ti ha parlato dell’app.`,
      /** Valido: si dice cosa è costato a chi te l'ha dato. */
      valido: 'Invito valido: qualcuno ha speso il suo unico posto per te.',
      /** Non valido: due cause, entrambe verificabili da chi legge. */
      nonValido: 'Questo codice non esiste, oppure è già stato usato.',
      /** Campo vuoto al momento di premere. */
      mancante: `Serve un codice di ${PAROLE.invito}: si entra solo se qualcuno ti porta dentro.`,
    },

    /** Controlli fatti prima di disturbare il server. */
    nomeMancante: 'Scrivi il tuo nome.',
    emailMancante: 'Scrivi la tua email.',
    dataNonValida: 'Data di nascita non valida: usa il formato GG/MM/AAAA.',
    dataInesistente: 'Questa data non esiste. Controlla giorno e mese.',
    dataNelFuturo: 'Questa data è nel futuro.',
    annoSbagliato: 'Controlla l’anno: sembra sbagliato.',
    troppoGiovane: (anni: number) => `Devi avere almeno ${anni} anni per stare qui.`,
    passwordCorta: (caratteri: number) => `La password deve avere almeno ${caratteri} caratteri.`,

    /**
     * Email di conferma partita: la sessione non c'è ancora, quindi si torna
     * all'accesso. ⚠️ Voce funzione: l'indirizzo entra nel testo.
     */
    confermaTitolo: 'Conferma la tua email',
    confermaTesto: (email: string) =>
      `${PAROLE.progetto} ha inviato una email a ${email}: apri il link di conferma, poi accedi.`,
  },

  passwordDimenticata: {
    titolo: 'Password dimenticata',
    /**
     * «Se il tuo account esiste» non è prudenza legale: dire «questa email non
     * esiste» direbbe a chiunque quali indirizzi sono iscritti.
     */
    spiegazione: `Se il tuo account esiste, arriva un link che apre ${PAROLE.progetto} direttamente sul cambio password.`,
    email: 'Email',
    emailSegnaposto: 'tu@esempio.it',
    invia: 'Invia il link',
    emailMancante: 'Scrivi la tua email.',
    inviata: 'Controlla la tua email: il link porta alla schermata per scegliere una nuova password.',
  },

  nuovaPassword: {
    titolo: 'Nuova password',
    spiegazione: 'Scegli una password nuova per finire il recupero del tuo account.',
    nuova: 'Nuova password',
    nuovaSegnaposto: (caratteri: number) => `Almeno ${caratteri} caratteri`,
    conferma: 'Conferma password',
    confermaSegnaposto: 'Ripeti la nuova password',
    aggiorna: 'Aggiorna la password',
    passwordCorta: (caratteri: number) => `La password deve avere almeno ${caratteri} caratteri.`,
    nonCoincidono: 'Le due password non coincidono.',
    /** Il link è scaduto o già speso: si dice da dove si ricomincia. */
    linkScaduto: 'Questo link non è più valido: richiedine un altro dalla schermata di accesso.',
    linkNonAttivo: 'Il link di recupero non è attivo: richiedine un altro dalla schermata di accesso.',
    fatta: 'Password aggiornata.',
    fattaTesto: 'Ora puoi accedere con la password nuova.',
  },

  /**
   * GLI ERRORI DELLA SOGLIA, tradotti da `lib/auth-errors.ts`.
   *
   * Regola: ogni frase deve dire DI CHI È IL PROBLEMA e COSA SI FA ADESSO.
   * Prima qui finiva la risposta grezza del server: in un caso reale è finita
   * a schermo un'intera risposta HTTP in JSON, centinaia di caratteri
   * illeggibili.
   */
  errori: {
    /** Il servizio email è fermo: il problema non è di chi legge, e va detto. */
    emailNonInviata: `Il servizio che manda le email non risponde: è un problema di ${PAROLE.progetto}, non tuo. Riprova più tardi, oppure scrivi a chi gestisce la beta.`,
    emailGiaUsata: 'Esiste già un account con questa email. Prova ad accedere, oppure usa «Password dimenticata?».',
    credenzialiErrate: 'Email o password non corretti.',
    emailNonConfermata: 'Devi prima confermare la tua email: apri il link che hai ricevuto.',
    passwordDebole: (caratteri: number) => `Password troppo debole: usane una di almeno ${caratteri} caratteri.`,
    emailNonValida: 'Questo indirizzo email non sembra valido.',
    troppiTentativi: 'Troppi tentativi in poco tempo. Aspetta qualche minuto e riprova.',

    /** Sconosciuto: una frase utile, MAI la risposta grezza del server. */
    registrazioneNonRiuscita:
      'Registrazione non riuscita. Riprova fra poco; se continua, segnalalo a chi gestisce la beta.',
    accessoNonRiuscito: 'Accesso non riuscito. Riprova fra poco.',

    /**
     * I due casi dell'invito, sollevati dal database.
     *
     * ⚠️ Sono qui, e non solo in SQL, perché l'app deve poterli dire anche
     *    quando il messaggio del server arriva con un codice stabile invece
     *    che con una frase. Vedi `lib/auth-errors.ts`.
     */
    invitoMancante: `Per entrare in ${PAROLE.progetto} serve un ${PAROLE.invito}.`,
    invitoNonValido: 'Questo invito non è valido, oppure è già stato usato.',
  },

  /**
   * L'ONBOARDING.
   *
   * ⚠️ Il maiuscolo dei titoli lo mette `ThemedText type="title"`. Qui si
   *    scrive in tondo, o il titolo arriva urlato nei posti senza foglio di
   *    stile e TalkBack lo legge lettera per lettera.
   */
  onboarding: {
    /**
     * LE DUE COSE CHE L'ONBOARDING NON HA MAI DETTO, e che il piano chiedeva.
     *
     * 1. CHE RICEVERAI UN INVITO DA SPENDERE. È il meccanismo che regge tutta
     *    la community, e non lo si scopriva da nessuna parte prima di
     *    entrare. Dirlo all'ingresso fa fermare a pensare chi poi dovrà
     *    scegliere a chi darlo.
     * 2. CHE QUESTA È UNA BETA. Chi entra su invito, si aspetta una festa, e
     *    trova un feed vuoto, conclude che l'app è rotta. Costa due righe e
     *    salva metà delle prime impressioni.
     */
    slide: [
      {
        icon: 'cheers',
        titolo: 'Non è un delivery',
        testo: 'Oggi porti tu una birra. Domani qualcuno la porta a te. Nessuno ci guadagna sopra.',
      },
      {
        icon: 'wallet',
        titolo: 'Solo BeerCoin',
        testo:
          'Si guadagnano contribuendo. Non si comprano, non si trasferiscono e non diventano denaro.',
      },
      {
        icon: 'pin',
        titolo: 'Prima la sicurezza',
        testo:
          'L’indirizzo resta protetto. Il codice chiude il giro solo quando siete davvero insieme.',
      },
      {
        /**
         * ⚠️ Slide nuova. «Ne hai uno solo» è il punto: l'invito non costa
         *    niente, e proprio per questo è la cosa più preziosa dell'app.
         *    Il premio non si nomina qui — dirlo all'ingresso lo farebbe
         *    sembrare un guadagno, che è esattamente quello che non è.
         */
        icon: 'profile',
        titolo: 'Avrai un invito',
        testo:
          'Uno solo, ed è tuo. Serve a portare dentro una persona: prenditi il tempo di scegliere.',
      },
      {
        icon: 'smile',
        titolo: 'Vibe, se vuoi',
        testo: 'Puoi invitare chi porta a fermarsi. È sempre facoltativo e puoi cambiare idea.',
      },
    ] as const satisfies readonly SlideOnboarding[],

    /**
     * L'ultimo passo: città, maggiore età, regole.
     *
     * ⚠️ Diceva «Ci siamo quasi», ed è stato il contatore a fermarlo mentre
     *    veniva spostato qui tale e quale: «siamo» è un «noi». Da solo sarebbe
     *    innocuo — è un modo di dire — ma la regola non ammette eccezioni
     *    proprio perché ogni «noi» sembra innocuo preso da solo, e a forza di
     *    eccezioni ricompare la società che qui non c'è. «Manca poco» dice la
     *    stessa cosa senza nominare nessuno.
     */
    setupTitolo: 'Manca poco',
    filosofia: `Non è un delivery. È uno scambio di favori tra ${PAROLE.chiChiede} e chi porta nella stessa città.`,

    /**
     * ⚠️ LA RIGA DELLA BETA, e perché non è quella del piano alla lettera.
     *
     * Il piano la scriveva «Siamo pochi, ed è normale: certe sere il feed è
     * vuoto». Il senso è giusto e resta; la forma no: «siamo» è un «noi», e
     * la regola della voce lo elimina. Qui il «si» impersonale è ammesso
     * proprio perché **enuncia una regola del mondo** — che è l'unica
     * eccezione prevista.
     *
     * Sta sull'ultima schermata, non su una slide sua: il momento in cui
     * serve è quello immediatamente prima del feed.
     */
    beta: 'Certe sere il feed è vuoto, ed è normale: qui si comincia adesso.',

    citta: 'La tua città',
    trovaCitta: 'Trova la mia città',
    maggiorenne: (anni: number) => `Dichiaro di avere almeno ${anni} anni`,
    maggiorenneNota: `${PAROLE.progetto} è riservato a chi è maggiorenne.`,
    regole: 'Accetto le regole della community',
    regoleNota: 'Uso responsabile, niente vendita di alcol e rispetto della moderazione.',
    leggiRegole: 'Leggi le regole e la privacy',
    avanti: 'Avanti',
    entra: 'Entra nella community',
  },

  /**
   * IL TUO INVITO.
   *
   * In Beer to Beer si entra solo su invito e ognuno ne ha uno. La schermata è
   * costruita attorno a questo: non è una funzione di crescita da spingere, è
   * una scelta da far pesare. Per questo il codice non si mostra prima di aver
   * detto cosa comporta.
   *
   * ⚠️ L'invito NON HA PREZZO: darlo non costa niente, nemmeno un BeerCoin.
   *    Il premio arriva a valle — a entrambi, e solo quando chi è entrato
   *    conclude il suo primo giro. Il numero non si scrive qui: arriva da
   *    `lib/credits.ts`, che `formula-crediti.test.ts` confronta con l'ultima
   *    definizione SQL.
   */
  invito: {
    titolo: 'Il tuo invito',
    occhiello: 'Come si entra',
    /** ⚠️ Voce funzione: il numero di inviti liberi entra nel testo. */
    quanti: (liberi: number) =>
      liberi === 0 ? 'Hai già scelto' : liberi === 1 ? 'Hai un invito' : `Hai ${liberi} inviti`,
    intro: `Si entra solo se qualcuno ti porta dentro. Per questo qui non troverai un pulsante «invita tutti»: hai un posto solo, e quando lo usi è speso.`,

    aChiDarloTitolo: 'A chi darlo',
    aChiDarloTesto:
      'A qualcuno che vive la tua zona e che ti farebbe piacere incontrare sul pianerottolo alle undici di sera. Questa community regge finché le persone dentro si comportano bene: ogni invito è una tua garanzia su chi entra.',

    scriviNome: 'Scrivi a chi lo dai',
    cambiaNome: 'Il nome',
    copiaCodice: 'Copia il codice',
    codiceCopiato: 'Codice copiato.',
    condividi: 'Condividi l’invito',
    /** ⚠️ Voce funzione: il premio arriva da `lib/credits.ts`, mai scritto qui. */
    premio: (perTesta: number) =>
      `Quando chi inviti chiude il suo primo giro, prendete ${perTesta} ${PAROLE.gettone} a testa.`,

    portatiDentro: 'Chi hai portato dentro',
    speso: 'Il tuo invito è stato speso. Non ne arrivano altri: è così per tutti.',

    nonDisponibiliTitolo: 'Inviti non disponibili',
    nonDisponibiliTesto: 'Controlla la connessione e riprova.',
    condivisioneFallita: 'La condivisione non si è aperta. Riprova.',

    /** Il campo «A chi lo dai?»: fa fermare a pensare prima di spendere. */
    nominaTitolo: 'A chi lo dai?',
    nominaSpiegazione: 'Serve solo a scrivere il messaggio e a ricordartelo. Non lo vede nessun altro.',
    nominaSegnaposto: 'Il suo nome',
    nominaConferma: 'Salva',

    /**
     * Come si firma il messaggio quando il nome di chi invita non c'è.
     *
     * ⚠️ Non è un dettaglio: il messaggio d'invito è l'unico testo che si
     *    legge PRIMA di avere l'app, e senza firma somiglia a una catena di
     *    Sant'Antonio. «un amico» è meglio di una riga vuota, ma è un ripiego:
     *    se compare spesso, il posto da correggere è il profilo.
     */
    mittenteIgnoto: 'un amico',

    /**
     * IL MESSAGGIO CHE ESCE DALL'APP.
     *
     * È l'unico testo di Beer to Beer che una persona legge PRIMA di avere
     * l'app, e finora era un blocco anonimo: non diceva chi lo mandava — «ti
     * porto dentro», ma chi? — né a chi era destinato, mentre la schermata
     * prometteva «ho scelto te». Su WhatsApp un testo così somiglia a una
     * catena di Sant'Antonio, che è il contrario di quello che è.
     *
     * E diceva «community di Torino» scritto a mano, in un'app che ha quattro
     * città: chi invitava da Milano mandava un messaggio falso.
     */
    messaggio: (code: string, nominativo: string | undefined, citta: string, mittente: string, link: string) =>
      [
        nominativo
          ? `${nominativo}, ti porto dentro ${PAROLE.progetto}.`
          : `Ti porto dentro ${PAROLE.progetto}.`,
        '',
        `È una community di ${citta}: ci si porta le birre a vicenda fra chi abita vicino. Nessuno ci guadagna niente. Chi porta si fa rimborsare la spesa e prende ${PAROLE.gettone}, che valgono solo qui dentro e non diventano soldi.`,
        '',
        'Si entra solo su invito e ognuno ne ha uno. Il mio l’ho dato a te.',
        '',
        `Il tuo codice: ${code}`,
        link ? `L’app: ${link}` : 'Chiedimi il link per scaricarla.',
        '',
        `— ${mittente}`,
      ].join('\n'),
  },

  confermaEmail: {
    /**
     * ⚠️ Diceva «Sto confermando il tuo account»: l'app in prima persona.
     *    Il soggetto è il progetto, oppure la frase si gira sull'azione.
     */
    inCorso: 'Conferma in corso…',
    titoloErrore: 'Link non valido',
    linkIncompleto: 'Link incompleto: riapri quello che hai ricevuto per email.',
    linkScaduto: 'Questo link non è più valido: può essere già stato usato, oppure scaduto.',
  },
} as const;
