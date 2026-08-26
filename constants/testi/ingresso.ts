import { PAROLE } from './parole';

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
