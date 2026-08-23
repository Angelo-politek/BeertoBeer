/**
 * Traduce gli errori di autenticazione in frasi comprensibili.
 *
 * Senza questo, la schermata mostrava il messaggio grezzo del server: in un
 * caso reale è finita a schermo un'intera risposta HTTP in JSON, centinaia di
 * caratteri illeggibili. Chi si registra non deve mai vedere una cosa simile —
 * e soprattutto deve capire se il problema è suo (email già usata, invito
 * sbagliato) o nostro (servizio email fermo).
 */
export function messaggioAuth(errore: unknown, contesto: 'registrazione' | 'accesso' = 'registrazione'): string {
  const grezzo = String((errore as { message?: string })?.message ?? errore ?? '');
  const t = grezzo.toLowerCase();

  if (t.includes('confirmation email') || t.includes('recovery email') || t.includes('sending email')) {
    return 'Non riusciamo a inviare l’email di conferma: il problema è dalla nostra parte, non tuo. Riprova più tardi o scrivi a chi gestisce la beta.';
  }
  if (t.includes('invito')) return grezzo; // messaggi nostri, già in italiano
  if (t.includes('already registered') || t.includes('user already')) {
    return 'Esiste già un account con questa email. Prova ad accedere, oppure usa “Password dimenticata?”.';
  }
  if (t.includes('invalid login credentials')) return 'Email o password non corretti.';
  if (t.includes('email not confirmed')) {
    return 'Devi prima confermare la tua email: apri il link che ti abbiamo inviato.';
  }
  if (t.includes('password should be') || t.includes('weak password')) {
    return 'Password troppo debole: usane una di almeno 6 caratteri.';
  }
  if (t.includes('invalid email') || t.includes('unable to validate email')) {
    return 'Questo indirizzo email non sembra valido.';
  }
  if (t.includes('rate limit') || t.includes('too many')) {
    return 'Troppi tentativi in poco tempo. Aspetta qualche minuto e riprova.';
  }
  if (t.includes('network') || t.includes('fetch')) {
    return 'Connessione assente o instabile. Controlla la rete e riprova.';
  }

  // Sconosciuto: una frase utile, MAI la risposta grezza del server.
  return contesto === 'registrazione'
    ? 'Registrazione non riuscita. Riprova fra poco; se continua, segnalalo a chi gestisce la beta.'
    : 'Accesso non riuscito. Riprova fra poco.';
}
