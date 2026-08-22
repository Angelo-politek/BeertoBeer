import {
  CREDIT_CAP,
  DEFAULT_FORMAT,
  estimateBonus,
  estimateCredits,
  FORMAT_WEIGHTS,
  maxDistanceBonus,
  orderWeightKg,
} from '@/lib/credits';
import type { BeerItem } from '@/types';

/**
 * I BeerCoin sono l'unica cosa nell'app che vale soldi veri: chi consegna
 * anticipa la spesa delle birre e viene ripagato in crediti. Se questi calcoli
 * si scollegano da quelli del database, qualcuno ci rimette.
 *
 * FONTE DI VERITÀ: supabase/schema.sql →
 *   format_weight(formato)        pesi per formato
 *   order_weight_kg(lista)        somma quantita * peso
 *   credits_for_weight(lista)     least(10, ceil(1 + peso * 0.5))
 *   accept_order                  bonus = round(km * 0.5), totale <= 10
 *
 * Se un giorno cambiano lì, questi test devono fallire: è il loro scopo.
 */

const birra = (formato: string, quantita = 1): BeerItem => ({
  nome: 'Test',
  quantita,
  formato,
});

describe('pesi dei formati (mirror di format_weight in SQL)', () => {
  it('vale gli stessi kg dichiarati nel database', () => {
    expect(FORMAT_WEIGHTS).toEqual({
      '33cl': 0.55,
      '50cl': 0.85,
      '66cl': 1.1,
      '75cl': 1.3,
      lattina33: 0.4,
      lattina50: 0.58,
    });
  });

  it('un formato sconosciuto pesa come una 33cl, come fa il default SQL', () => {
    expect(orderWeightKg([birra('formato-inventato')])).toBe(FORMAT_WEIGHTS[DEFAULT_FORMAT]);
  });

  it('somma quantità e formati diversi', () => {
    // 2 × 0.55 + 3 × 1.3 = 1.10 + 3.90 = 5.00
    expect(orderWeightKg([birra('33cl', 2), birra('75cl', 3)])).toBeCloseTo(5, 5);
  });
});

describe('costo del giro (mirror di credits_for_weight in SQL)', () => {
  it('una birra piccola costa il minimo: ceil(1 + 0.55*0.5) = 2', () => {
    expect(estimateCredits([birra('33cl')])).toBe(2);
  });

  it('dieci bottiglie grandi costano 8: ceil(1 + 13*0.5) = 8', () => {
    expect(estimateCredits([birra('75cl', 10)])).toBe(8);
  });

  it('non supera mai il tetto di 10, per quanto grande sia l ordine', () => {
    expect(estimateCredits([birra('75cl', 100)])).toBe(CREDIT_CAP);
    expect(estimateCredits([birra('75cl', 10_000)])).toBe(CREDIT_CAP);
  });

  it('un ordine vuoto costa comunque la base: ceil(1) = 1', () => {
    expect(estimateCredits([])).toBe(1);
  });

  it('non produce mai un costo negativo o frazionario', () => {
    for (const q of [1, 2, 3, 7, 25]) {
      const costo = estimateCredits([birra('50cl', q)]);
      expect(Number.isInteger(costo)).toBe(true);
      expect(costo).toBeGreaterThan(0);
    }
  });
});

describe('bonus distanza (mirror di accept_order in SQL)', () => {
  it('vale round(km * 0.5)', () => {
    expect(estimateBonus(0)).toBe(0);
    expect(estimateBonus(4)).toBe(2);
    expect(estimateBonus(4.4)).toBe(2); // round(2.2)
    expect(estimateBonus(5)).toBe(3); // round(2.5) → 3
  });

  it('il margine residuo prima del tetto non è mai negativo', () => {
    expect(maxDistanceBonus([birra('33cl')])).toBe(CREDIT_CAP - 2);
    expect(maxDistanceBonus([birra('75cl', 100)])).toBe(0);
  });

  it('costo + bonus massimo non sfonda mai il tetto', () => {
    for (const q of [1, 5, 10, 50]) {
      const lista = [birra('66cl', q)];
      expect(estimateCredits(lista) + maxDistanceBonus(lista)).toBeLessThanOrEqual(CREDIT_CAP);
    }
  });
});
