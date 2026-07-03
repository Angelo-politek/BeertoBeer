import type { BeerRequest, OrderStatus } from '@/types';

/** Etichetta leggibile dello stato di un ordine. */
export const STATO_LABEL: Record<OrderStatus, string> = {
  richiesto: 'In attesa di un driver',
  accettato: 'Accettato',
  in_consegna: 'In consegna',
  consegnato: 'Consegnato',
  confermato: 'Completato',
};

/**
 * Dopo quante ore una richiesta aperta esce dal feed. Mirror del filtro nella
 * vista `open_requests` (schema.sql), che è la fonte di verità.
 */
export const REQUEST_TTL_HOURS = 12;

/** True se una richiesta aperta è scaduta (non più visibile nel feed). */
export function isExpired(request: BeerRequest): boolean {
  if (request.stato !== 'richiesto') return false;
  return Date.now() - new Date(request.createdAt).getTime() > REQUEST_TTL_HOURS * 60 * 60 * 1000;
}
