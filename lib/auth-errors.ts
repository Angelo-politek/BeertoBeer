import { INGRESSO, VOCE } from '@/constants/testi';
import { PASSWORD_MINIMA } from '@/lib/limiti';

/**
 * Traduce gli errori di autenticazione in frasi comprensibili.
 *
 * Senza questo, la schermata mostrava il messaggio grezzo del server: in un
 * caso reale è finita a schermo un'intera risposta HTTP in JSON, centinaia di
 * caratteri illeggibili. Chi si registra non deve mai vedere una cosa simile —
 * e soprattutto deve capire se il problema è suo (email già usata, invito
 * sbagliato) o del servizio (email ferme).
 */

/**
 * ⚠️ LA TRAPPOLA CHE STAVA IN QUESTO FILE, E COME È STATA CHIUSA.
 *
 * Prima qui c'era una riga sola:
 *
 *     if (t.includes('invito')) return grezzo;
 *
 * Cioè: «se il messaggio del database contiene la PAROLA invito, mostralo
 * così com'è, tanto è già in italiano». Funzionava per un caso: i due
 * messaggi che `handle_new_user()` solleva contengono davvero quella parola.
 *
 * Ma è un aggancio al TESTO di un messaggio, e il testo dei messaggi è
 * esattamente la cosa che C6 sta riscrivendo. Il giorno in cui una migrazione
 * riscrive «Per entrare in Beer to Beer serve un invito» in una frase che
 * quella parola non la contiene — per dire, «Si entra solo se qualcuno ti
 * porta dentro» — questo `if` smette di scattare, si cade nel ramo finale, e
 * l'app dice «Registrazione non riuscita» PROPRIO dove doveva spiegare quale
 * problema c'è col codice. Nessun test lo prenderebbe: i test non eseguono
 * SQL, e il tipo di ritorno non cambia.
 *
 * La correzione non è ricordarsi di non toccare quella parola: è smettere di
 * dipendere dalle parole. Il database può anteporre un CODICE STABILE
 *
 *     BTB:invito_non_valido: <frase leggibile>
 *
 * e qui si riconosce il codice, non la frase. Il codice è un'interfaccia e si
 * versiona; una frase è copy e cambia quando deve cambiare.
 *
 * ⚠️ FINCHÉ LA MIGRAZIONE NON È STATA ESEGUITA, il database manda ancora le
 *    frasi vecchie: per questo il riconoscimento per parola resta vivo qui
 *    sotto, dichiarato come ponte e non come regola. Si toglie quando il
 *    prefisso è in produzione — mai prima, o si rompe la registrazione di chi
 *    sta usando il database attuale (regola della casa: SQL prima, app dopo).
 */
const PREFISSO_CODICE = /^BTB:([a-z_]+):\s*/i;

/** I codici che il database può mandare, e cosa si dice a chi legge. */
const PER_CODICE: Record<string, string> = {
  invito_mancante: INGRESSO.errori.invitoMancante,
  invito_non_valido: INGRESSO.errori.invitoNonValido,
};

export function messaggioAuth(errore: unknown, contesto: 'registrazione' | 'accesso' = 'registrazione'): string {
  const grezzo = String((errore as { message?: string })?.message ?? errore ?? '');

  // 1. Il codice stabile, se c'è: è l'unico aggancio che non dipende dal copy.
  const conCodice = grezzo.match(PREFISSO_CODICE);
  if (conCodice) {
    const noto = PER_CODICE[conCodice[1].toLowerCase()];
    if (noto) return noto;
    // Codice sconosciuto (app vecchia, database nuovo): si mostra almeno la
    // frase leggibile che segue il prefisso, mai il prefisso stesso.
    const resto = grezzo.replace(PREFISSO_CODICE, '').trim();
    if (resto) return resto;
  }

  const t = grezzo.toLowerCase();

  if (t.includes('confirmation email') || t.includes('recovery email') || t.includes('sending email')) {
    return INGRESSO.errori.emailNonInviata;
  }

  // ⚠️ PONTE, non regola: vedi il commento in cima. Si toglie il giorno in cui
  //    il prefisso `BTB:` è in produzione, non prima.
  if (t.includes('invito')) return grezzo; // messaggi nostri, già in italiano

  if (t.includes('already registered') || t.includes('user already')) {
    return INGRESSO.errori.emailGiaUsata;
  }
  if (t.includes('invalid login credentials')) return INGRESSO.errori.credenzialiErrate;
  if (t.includes('email not confirmed')) {
    return INGRESSO.errori.emailNonConfermata;
  }
  if (t.includes('password should be') || t.includes('weak password')) {
    return INGRESSO.errori.passwordDebole(PASSWORD_MINIMA);
  }
  if (t.includes('invalid email') || t.includes('unable to validate email')) {
    return INGRESSO.errori.emailNonValida;
  }
  if (t.includes('rate limit') || t.includes('too many')) {
    return INGRESSO.errori.troppiTentativi;
  }
  if (t.includes('network') || t.includes('fetch')) {
    return VOCE.rete.instabile;
  }

  // Sconosciuto: una frase utile, MAI la risposta grezza del server.
  return contesto === 'registrazione'
    ? INGRESSO.errori.registrazioneNonRiuscita
    : INGRESSO.errori.accessoNonRiuscito;
}
