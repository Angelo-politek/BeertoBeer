import { PAROLE } from './parole';

/**
 * FUORI: le uscite, il foglio, la mappa.
 *
 * L'oggetto centrale della V3. A schermo: **un'uscita** · stato **FUORI** ·
 * persona **chi è fuori** · dichiara **SONO FUORI** · ritira **NON CI VADO
 * PIÙ**. Mai «disponibilità», mai «annuncio», mai «stato».
 */
export const FUORI = {
  /**
   * LE TRE FACCE, con le parole che userebbe una persona.
   *
   * ⚠️ `titolo` è IN PRIMA PERSONA di proposito, ed è l'unica eccezione della
   *    regola sull'«io»: non è l'app che parla di sé, è la frase che stai per
   *    pronunciare tu, e il tasto te la mostra prima di fartela dire.
   *
   * `breve` serve dove ci vuole una parola sola: un chip, un filtro, la mappa.
   */
  forme: {
    negozio: {
      titolo: 'Passo dal negozio',
      breve: 'Negozio',
      spiega:
        'Stai andando, o sei già lì. Se qualcuno in zona ha bisogno di birre, gliele porti mentre torni.',
    },
    birra: {
      titolo: 'Bevo una birra',
      breve: 'Birra',
      spiega: 'Sei seduto da qualche parte. Chi vuole può raggiungerti, e nessuno è obbligato a fermarsi.',
    },
    zona: {
      titolo: 'Sono in zona',
      breve: 'Zona',
      spiega: 'Sei fuori e basta. Ti fai trovare, poi si vede.',
    },
  },

  /** Le due sole azioni, entrambe in prima persona: le dici tu. */
  dichiara: 'Sono fuori',
  ritira: 'Non ci vado più',

  /**
   * IL FOGLIO: due tocchi, quindici secondi.
   *
   * ⚠️ Le due frasi «si chiude da sola» e «puoi rientrare quando vuoi» NON
   *    sono decorazione: dichiarare a un'app dove sei è la cosa che fa
   *    esitare di più. Se si tagliano per fare spazio, la funzione la usa
   *    meno gente.
   */
  foglio: {
    stasera: 'Stasera',
    domanda: 'Ci sei?',
    finoAQuando: 'Fino a quando',
    dichiaraTitolo: 'Sei fuori',
    siChiudeDaSola: 'Si chiude da sola. Non resta niente aperto a tua insaputa.',
    ciSeiFino: (fino: string) => `Ci sei ${fino}. Puoi rientrare quando vuoi.`,
    siChiudeAlle: (fino: string) => `Si chiude da sola ${fino}. Puoi rientrare quando vuoi.`,
    notaSegnaposto: 'Passo dal minimarket, serve niente?',
    /** ⚠️ Voce funzione: zona e città entrano nel testo. */
    daDove: (dove: string) => `${dove} · dal tuo telefono`,

    /** ⚠️ Dicevano «Sto guardando dove sei» e «non posso dirlo a nessuno». */
    cercandoPosizione: 'Posizione in corso…',
    senzaPosizione: 'Senza posizione non si può dire a nessuno dove sei. Attiva il GPS e riapri.',
    fuoriCitta: (citta: string) => `Sembri fuori da ${citta}. Cambia città dal feed, oppure avvicinati.`,

    nonPartita: 'L’uscita non è partita. Riprova fra poco.',
    rientrato: 'Sei rientrato.',
    nonChiusa: 'L’uscita non si è chiusa. Riprova fra poco.',
  },

  /** LA MAPPA: i marker e cosa si può fare da lì. */
  mappa: {
    tuaPosizione: 'La tua posizione',
    eFuori: (nome: string) => `${nome} è fuori`,
    inZona: (zona: string) => ` · ${zona}`,
    vediChiE: 'Vedi chi è',
    apriGiro: `Apri il ${PAROLE.giro}`,
    apriEvento: 'Apri l’evento',
    apriIncontro: 'Apri l’incontro',
    orariNonSegnalati: 'Orari non segnalati.',
    apriIndicazioni: 'Apri le indicazioni',
    segnalaNegozio: 'Segnala un negozio',
  },

  /** SEGNALARE UN NEGOZIO alla città. */
  negozio: {
    nome: 'Nome del negozio',
    nomeSegnaposto: 'Es. Minimarket Via Po',
    orari: 'Orari stimati (facoltativo)',
    puntoScelto: 'Punto selezionato',
    aggiungi: 'Aggiungi',
    orariSegnaposto: 'Es. 9–24, anche la domenica',
    toccaPosizione: 'Tocca la posizione del negozio sulla mappa:',
    segnala: 'Segnala un negozio',
  },

  /** La legenda della mappa: un tocco accende e spegne un livello. */
  legenda: {
    giri: `${PAROLE.giri.charAt(0).toUpperCase()}${PAROLE.giri.slice(1)}`,
    negozi: 'Negozi',
    incontri: 'Incontri ed eventi',
    chiEFuori: 'Chi è fuori',
  },

  /** Chi è fuori adesso. */
  chiEFuori: 'Chi è fuori',
  chiediUnGiro: `Chiedi un ${PAROLE.giro}`,
} as const;
