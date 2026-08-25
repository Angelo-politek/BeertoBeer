import type { BeerRequest, OrderStatus } from '@/types';

/** Etichetta leggibile dello stato di un ordine. */
export const STATO_LABEL: Record<OrderStatus, string> = {
  richiesto: 'In attesa',
  accettato: 'Accettato',
  in_consegna: 'In arrivo',
  arrivato: 'Arrivato',
  consegnato: 'Consegnato',
  confermato: 'Completato',
  annullato: 'Annullato',
};

export const ORDER_TIMELINE: OrderStatus[] = ['richiesto', 'accettato', 'in_consegna', 'arrivato', 'consegnato', 'confermato'];

/**
 * Dopo quante ore una richiesta aperta esce dal feed. Mirror del filtro nella
 * vista `open_requests` (schema.sql), che è la fonte di verità.
 */
export const REQUEST_TTL_HOURS = 12;

/** True se una richiesta aperta è scaduta (non più visibile nel feed). */
export function isExpired(request: BeerRequest): boolean {
  if (request.stato !== 'richiesto') return false;
  // La scadenza la decide il server (orders.scade_il, fonte: ttl_giro()).
  // Il calcolo su createdAt resta per le righe lette da un bundle che non
  // conosce ancora la colonna, e per gli ordini storici.
  if (request.scadeIl) return Date.now() > new Date(request.scadeIl).getTime();
  return Date.now() - new Date(request.createdAt).getTime() > REQUEST_TTL_HOURS * 60 * 60 * 1000;
}

/**
 * PERCHE' SU QUESTO GIRO NON SI PUO' PIU' FARE NIENTE — o null se si puo'.
 *
 * Lo stato di un giro non e' una colonna sola: `stato` dice a che punto e' lo
 * scambio, `congelato` dice che una segnalazione di sicurezza lo ha fermato,
 * `stato_moderazione` dice che e' stato tolto dal feed, e la scadenza non e'
 * scritta da nessuna parte. Quattro assi indipendenti, letti da tre schermate
 * diverse con criteri diversi.
 *
 * Risultato del collaudo, due segnalazioni distinte: un giro rimosso per
 * segnalazione continuava a comparire come «GIRO ATTIVO» in cima alla home di
 * chi l'aveva lanciato; e dopo aver premuto «non mi sento al sicuro» la
 * schermata restava identica, con i pulsanti che il server ora rifiuta.
 *
 * Da qui in avanti la domanda si fa in un posto solo, e la risposta e' una
 * frase da mostrare — non un booleano da interpretare.
 */
export function motivoNonAgibile(request: BeerRequest): string | null {
  if (request.congelato) return 'Fermo: una segnalazione e in verifica';
  if (request.statoModerazione === 'rimosso') return 'Rimosso dalla moderazione';
  if (request.statoModerazione === 'oscurato') return 'In verifica';
  if (isExpired(request)) return 'Scaduto';
  return null;
}

/** Un giro chiuso e' chiuso: concluso, annullato, scaduto, fermo o rimosso. */
export function giroChiuso(request: BeerRequest): boolean {
  return ['confermato', 'annullato'].includes(request.stato) || motivoNonAgibile(request) !== null;
}
