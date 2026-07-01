import type { OrderStatus } from '@/types';

/** Etichetta leggibile dello stato di un ordine. */
export const STATO_LABEL: Record<OrderStatus, string> = {
  richiesto: 'In attesa di un driver',
  accettato: 'Accettato',
  in_consegna: 'In consegna',
  consegnato: 'Consegnato',
  confermato: 'Completato',
};
