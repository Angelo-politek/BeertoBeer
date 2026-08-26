import { GLOSSARY, TOKEN_NAME, TOKEN_SHORT } from '@/constants/branding';

/**
 * I NOMI DELLE COSE.
 *
 * Questo file NON ridefinisce niente: rimanda a `constants/branding.ts`, che
 * è e resta la fonte unica. Esiste perché il resto di `testi/` deve poter
 * comporre una frase senza riscrivere «giro» a mano — e perché il giorno in
 * cui una parola cambia, deve cambiare in un posto solo davvero.
 *
 * ⚠️ Se stai per aggiungere qui un sinonimo di qualcosa che ha già un nome,
 *    fermati: è esattamente il difetto che `glossario.test.ts` esiste per
 *    impedire, e che è costato la segnalazione più grave della beta.
 */
export const PAROLE = {
  /** L'oggetto della portata. Mai «consegna», mai «ordine», mai «richiesta». */
  giro: GLOSSARY.delivery,
  giri: GLOSSARY.deliveryPlural,

  /** I due ruoli. Mai «utente», mai «driver», mai «host». */
  chiChiede: GLOSSARY.roleAsker,
  chiPorta: GLOSSARY.roleCarrier,

  /** Il gettone. Sempre per nome: «crediti» evoca un conto in banca. */
  gettone: TOKEN_NAME,
  gettoneBreve: TOKEN_SHORT,

  /** Il cancello d'ingresso. Mai «referral», mai «codice promo». */
  invito: 'invito',
  inviti: 'inviti',

  /**
   * Il nome del progetto, scritto per esteso.
   *
   * ⚠️ È anche il SOGGETTO che sostituisce il «noi» nei testi: «Beer to Beer
   *    è riservato a chi ha almeno 18 anni», non «siamo riservati a…». Un
   *    «noi» evoca una società, e qui non c'è nessuna società.
   */
  progetto: 'Beer to Beer',
} as const;
