import fs from 'fs';
import path from 'path';

import {
  CREDIT_BASE,
  CREDIT_CAP,
  CREDIT_PER_KG,
  CREDIT_PER_KM,
  estimateBonus,
  estimateCredits,
  FORMAT_WEIGHTS,
  orderWeightKg,
} from '@/lib/credits';

/**
 * UNA FORMULA SOLA.
 *
 * lib/credits.ts dichiara nel proprio commento di essere «uno specchio» di
 * `credits_for_weight` e `accept_order` in SQL. Uno specchio si incrina: la
 * stessa cosa scritta in due posti è la classe di errore che in questo
 * progetto è già costata tre correzioni dello stesso confronto sbagliato e una
 * chat bloccata proprio sotto casa.
 *
 * Qui i due posti restano due — l'app deve poter stimare i BeerCoin mentre si
 * scrive, senza chiedere niente alla rete a ogni tasto — ma non possono più
 * divergere in silenzio: questo test legge il vero SQL e confronta.
 *
 * L'autorità resta il database. Se questo test fallisce, si corregge
 * lib/credits.ts, non lo schema.
 */

const RADICE = path.join(__dirname, '..', '..');
const schema = fs.readFileSync(path.join(RADICE, 'supabase/schema.sql'), 'utf8');

describe('la formula del peso è la stessa nei due posti', () => {
  /** `select least(10, ceil(1 + public.order_weight_kg(p_lista) * 0.5))::int;` */
  const riga = schema
    .split('\n')
    .find((l) => l.includes('least(') && l.includes('order_weight_kg'));

  it('la formula esiste nello schema', () => {
    expect(riga).toBeDefined();
  });

  it('il tetto è lo stesso', () => {
    expect(Number(riga!.match(/least\((\d+)/)![1])).toBe(CREDIT_CAP);
  });

  it('la base è la stessa', () => {
    expect(Number(riga!.match(/ceil\(([\d.]+)\s*\+/)![1])).toBe(CREDIT_BASE);
  });

  it('i BeerCoin per chilo sono gli stessi', () => {
    expect(Number(riga!.match(/\*\s*([\d.]+)\)\)/)![1])).toBe(CREDIT_PER_KG);
  });
});

describe('i pesi dei formati sono gli stessi nei due posti', () => {
  /** Le righe `when '33cl' then 0.55` di public.format_weight(). */
  const inizio = schema.indexOf('function public.format_weight');
  const corpo = schema.slice(inizio, schema.indexOf('$$;', inizio));
  const pesiSql = Object.fromEntries(
    [...corpo.matchAll(/when\s+'([^']+)'\s+then\s+([\d.]+)/g)].map((m) => [m[1], Number(m[2])]),
  );

  it('lo schema dichiara tutti i formati che conosce l app', () => {
    expect(Object.keys(pesiSql).sort()).toEqual(Object.keys(FORMAT_WEIGHTS).sort());
  });

  it.each(Object.keys(FORMAT_WEIGHTS))('%s pesa uguale', (formato) => {
    expect(pesiSql[formato]).toBe(FORMAT_WEIGHTS[formato]);
  });
});

describe('il bonus distanza è lo stesso nei due posti', () => {
  it('i BeerCoin per km coincidono', () => {
    // In accept_order: `v_d constant numeric := 0.5;`
    const migrazione = fs.readFileSync(
      path.join(RADICE, 'supabase/migrations/20260822_beta_hardening.sql'),
      'utf8',
    );
    const trovato = migrazione.match(/v_d\s+constant\s+numeric\s*:=\s*([\d.]+)/);
    expect(trovato).not.toBeNull();
    expect(Number(trovato![1])).toBe(CREDIT_PER_KM);
  });
});

describe('quanto costa davvero un giro', () => {
  // Casi concreti, per accorgersi se una modifica cambia i prezzi senza volerlo.
  const birre = (n: number, formato = '33cl') => [{ nome: 'x', quantita: n, formato }];

  it('sei birre piccole pesano poco piu di tre chili', () => {
    expect(orderWeightKg(birre(6))).toBeCloseTo(3.3, 2);
  });

  it('un giro piccolo sotto casa resta a buon mercato', () => {
    expect(estimateCredits(birre(6))).toBe(3);
  });

  it('il tetto non si supera mai, comunque si carichi', () => {
    expect(estimateCredits(birre(200))).toBe(CREDIT_CAP);
  });

  it('la distanza pesa quanto dice la costante', () => {
    expect(estimateBonus(4)).toBe(Math.round(4 * CREDIT_PER_KM));
  });
});
