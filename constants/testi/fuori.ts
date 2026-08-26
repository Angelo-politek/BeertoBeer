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

  /** Chi è fuori adesso. */
  chiEFuori: 'Chi è fuori',
  chiediUnGiro: `Chiedi un ${PAROLE.giro}`,
} as const;
