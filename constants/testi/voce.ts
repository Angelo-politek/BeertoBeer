/**
 * LE BRICIOLE CHE TORNANO OVUNQUE.
 *
 * Tasti, conferme, frasi di riserva quando il server non ha detto niente di
 * utile. Stanno qui e non nelle aree perché una frase ripetuta in sei
 * schermate diverge in sei modi diversi: è già successo con «Riprova»,
 * «Riprova più tardi», «Riprova fra poco» e «Riprovare?» tutte vive insieme.
 *
 * ⚠️ Le frasi di riserva si scrivono pensando a COSA PUÒ FARE chi legge, non
 *    a cosa è andato storto. `lib/errori.ts` lo dice per esteso: un errore che
 *    non dice cosa fare costa due volte.
 */
export const VOCE = {
  /** Azioni. Il maiuscolo lo mette `Button`, non il sorgente. */
  azione: {
    riprova: 'Riprova',
    annulla: 'Annulla',
    chiudi: 'Chiudi',
    salva: 'Salva',
    indietro: 'Indietro',
    /**
     * ⚠️ «Torna al login» era in tre schermate. «Login» è la sola parola
     *    inglese della soglia, e la schermata a cui porta si chiama «Accedi»:
     *    due nomi per la stessa porta, che è il difetto di questo repository.
     */
    tornaAllAccesso: 'Torna all’accesso',
  },

  /** Quando il problema è la rete e non la persona. */
  rete: {
    assente: 'Connessione assente. Controlla la rete e riprova.',
    instabile: 'Connessione assente o instabile. Controlla la rete e riprova.',
  },

  /** Il tempo passato, detto come lo direbbe una persona. */
  quando: {
    adesso: 'un attimo fa',
    oreFa: (ore: number) => `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`,
  },

  /** Le foto: due errori che tornano in tre punti diversi. */
  foto: {
    permessoNegato: 'Permesso per accedere alle foto negato.',
    nonLeggibile: 'Immagine non leggibile.',
    posizioneNonValida: 'Posizione foto non valida.',
  },

  /** Caricamento parziale: alcune sezioni sì, altre no. */
  caricamentoParziale: 'Alcune sezioni non si sono caricate. Tira giù per riprovare.',

  /** Frasi di riserva: solo quando il server non ha detto niente di leggibile. */
  riserva: {
    riprovaFraPoco: 'Riprova fra poco.',
    nonSalvato: 'Non è stato salvato. Riprova fra poco.',
  },
} as const;
