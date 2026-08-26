import { VOCE } from '@/constants/testi';

/**
 * IL MESSAGGIO DEL SERVER NON SI BUTTA VIA.
 *
 * Perché questo file esiste: la schermata di un incontro faceva
 *
 *     catch { Alert.alert('Errore', 'Operazione non riuscita. Riprova.') }
 *
 * Il database rispondeva «Incontro non disponibile», l'app lo sostituiva con
 * una frase che non dice niente, e il difetto è arrivato al collaudo con tre
 * telefoni senza che nessuno potesse capirlo. Chi provava a unirsi vedeva
 * «riprova», riprovava, e falliva di nuovo.
 *
 * Un errore che non dice cosa è successo costa due volte: una all'utente che
 * non sa cosa fare, e una a chi deve trovare il difetto partendo da niente.
 */

/** Le forme in cui Supabase e i suoi RPC restituiscono un messaggio. */
type ErroreConMessaggio = {
  message?: unknown;
  error_description?: unknown;
  details?: unknown;
  hint?: unknown;
};

/** Postgres antepone questo ai messaggi delle eccezioni sollevate a mano. */
const PREFISSI_DA_TOGLIERE = [/^postgrest error:\s*/i, /^error:\s*/i];

function ripulisci(testo: string): string {
  let out = testo.trim();
  for (const prefisso of PREFISSI_DA_TOGLIERE) out = out.replace(prefisso, '');
  return out.trim();
}

/**
 * Il messaggio da mostrare: quello vero del server se c'è e se è leggibile,
 * altrimenti la frase di riserva.
 *
 * `riserva` non è un'alternativa comoda: serve per i casi in cui il server non
 * ha detto niente di utile (rete assente, errore senza testo). Scrivila
 * pensando a cosa può fare la persona, non a cosa è andato storto.
 */
export function messaggioServer(errore: unknown, riserva: string): string {
  if (typeof errore === 'string' && errore.trim().length > 0) return ripulisci(errore);

  const e = errore as ErroreConMessaggio | null | undefined;
  const candidati = [e?.message, e?.error_description, e?.details, e?.hint];

  for (const c of candidati) {
    if (typeof c !== 'string') continue;
    const pulito = ripulisci(c);
    if (pulito.length === 0) continue;
    // Messaggi di trasporto: non dicono niente a chi legge, e nascondono il
    // fatto che spesso il problema è solo la connessione.
    if (/^(network request failed|failed to fetch|load failed)$/i.test(pulito)) {
      return VOCE.rete.assente;
    }
    return pulito;
  }

  return riserva;
}
