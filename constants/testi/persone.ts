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
export const PERSONE = {
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
