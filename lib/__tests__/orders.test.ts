import { isExpired, ORDER_TIMELINE, REQUEST_TTL_HOURS, STATO_LABEL } from '@/lib/orders';
import type { BeerRequest, OrderStatus } from '@/types';

/**
 * Gli stati dell'ordine sono lo scheletro di tutta l'app: da essi dipende cosa
 * vede ciascuno dei due, quando compaiono i bottoni e quando si muovono i
 * BeerCoin. Mirror del vincolo orders_stato_chk in supabase/migrations.
 */

const STATI_AMMESSI: OrderStatus[] = [
  'richiesto',
  'accettato',
  'in_consegna',
  'arrivato',
  'consegnato',
  'confermato',
  'annullato',
];

const richiesta = (stato: OrderStatus, createdAt: string): BeerRequest =>
  ({ stato, createdAt } as BeerRequest);

describe('stati dell ordine', () => {
  it('ogni stato ammesso dal database ha un etichetta leggibile', () => {
    for (const stato of STATI_AMMESSI) {
      expect(STATO_LABEL[stato]).toBeTruthy();
    }
  });

  it('non esistono etichette per stati che il database rifiuterebbe', () => {
    expect(Object.keys(STATO_LABEL).sort()).toEqual([...STATI_AMMESSI].sort());
  });

  it('la sequenza del giro passa per gli stati nell ordine giusto', () => {
    expect(ORDER_TIMELINE).toEqual([
      'richiesto',
      'accettato',
      'in_consegna',
      'arrivato',
      'consegnato',
      'confermato',
    ]);
  });

  it('la sequenza non include gli stati fuori percorso', () => {
    expect(ORDER_TIMELINE).not.toContain('annullato');
  });
});

describe('scadenza di una richiesta aperta', () => {
  const oraFa = (ore: number) => new Date(Date.now() - ore * 3600 * 1000).toISOString();

  it('una richiesta appena creata non è scaduta', () => {
    expect(isExpired(richiesta('richiesto', oraFa(0)))).toBe(false);
  });

  it('resta valida fino al limite delle 12 ore', () => {
    expect(isExpired(richiesta('richiesto', oraFa(REQUEST_TTL_HOURS - 1)))).toBe(false);
  });

  it('oltre il limite è scaduta', () => {
    expect(isExpired(richiesta('richiesto', oraFa(REQUEST_TTL_HOURS + 1)))).toBe(true);
  });

  it('un giro già accettato non scade mai: è in corso, non in vetrina', () => {
    expect(isExpired(richiesta('accettato', oraFa(100)))).toBe(false);
    expect(isExpired(richiesta('consegnato', oraFa(100)))).toBe(false);
  });

  it('il limite dell app coincide con quello della vista open_requests', () => {
    expect(REQUEST_TTL_HOURS).toBe(12);
  });
});
