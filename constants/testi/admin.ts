import { PAROLE } from './parole';

/**
 * IL PANNELLO.
 *
 * ⚠️ Lo vedono due persone, e per questo è l'area in cui è più facile
 *    lasciarsi andare. Ma è anche l'unica in cui si scrivono frasi che UN'ALTRA
 *    PERSONA leggerà sul proprio telefono senza sapere da dove arrivano — la
 *    motivazione di un provvedimento è il testo più delicato dell'app dopo i
 *    termini. Qui la voce vale come altrove.
 */
export const ADMIN = {
  /**
   * I PROVVEDIMENTI.
   *
   * ⚠️ Il segnaposto diceva «Cosa e successo», senza accento — nella casella
   *    in cui si scrive la motivazione che verrà mandata alla persona.
   */
  provvedimento: {
    cosaFare: 'Cosa fare',
    perQuanto: 'Per quanto',

    avvertimento: 'Avvertimento',
    sospensione: 'Sospensione',
    esclusione: 'Esclusione',

    avvertimentoTesto: 'Nessuna limitazione, ma resta scritto nella storia della persona.',
    sospensioneTesto: `Non potrà lanciare ${PAROLE.giri} né accettarne fino alla scadenza.`,
    esclusioneTesto: `Fuori da ${PAROLE.progetto}. L'account non viene cancellato: ${PAROLE.giri} e segnalazioni restano consultabili.`,

    motivazione: 'Motivazione',
    segnaposto: 'Cosa è successo, in due righe',
    /** Si dice a chi scrive che quel testo esce dal pannello. */
    avvisoMotivazione: 'Questa motivazione viene mandata alla persona insieme al provvedimento.',
    applica: 'Applica',
  },
} as const;
