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

/**
 * Tutto lo SQL del progetto, nell'ordine in cui viene eseguito: prima lo
 * schema, poi le migrazioni in ordine di data.
 *
 * Leggere solo schema.sql sarebbe un errore sottile: una migrazione successiva
 * puo' ridefinire la stessa funzione, e il test finirebbe per confrontare
 * l'app con una formula che sul database non esiste piu'. Vale l'ULTIMA
 * definizione, come per Postgres.
 */
function sqlNellOrdineDiEsecuzione(): string {
  const migrazioni = fs
    .readdirSync(path.join(RADICE, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return [
    fs.readFileSync(path.join(RADICE, 'supabase/schema.sql'), 'utf8'),
    ...migrazioni.map((f) => fs.readFileSync(path.join(RADICE, 'supabase/migrations', f), 'utf8')),
  ].join('\n');
}

const schema = sqlNellOrdineDiEsecuzione();

describe('la formula del peso è la stessa nei due posti', () => {
  /** `select least(10, ceil(1 + public.order_weight_kg(p_lista) * 0.5))::int;` */
  // Serve l'ULTIMA: la migrazione del 01/09 ridefinisce la funzione, e la
  // definizione che conta e' quella che Postgres esegue per ultima.
  const righe = schema
    .split('\n')
    .filter((l) => l.includes('least(') && l.includes('order_weight_kg'));
  const riga = righe[righe.length - 1];

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
  const inizio = schema.lastIndexOf('function public.format_weight');
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
    // In accept_order: `v_d constant numeric := 1.0;`
    const tutte = [...schema.matchAll(/v_d\s+constant\s+numeric\s*:=\s*([\d.]+)/g)];
    expect(tutte.length).toBeGreaterThan(0);
    expect(Number(tutte[tutte.length - 1][1])).toBe(CREDIT_PER_KM);
  });

  it('il tetto dentro accept_order e lo stesso della parte peso', () => {
    // Sono due numeri diversi nello stesso file: se se ne cambia uno solo, i
    // giri lunghi vengono tagliati a un valore che l'app non si aspetta.
    const tetti = [...schema.matchAll(/v_total := least\((\d+),/g)];
    expect(tetti.length).toBeGreaterThan(0);
    expect(Number(tetti[tetti.length - 1][1])).toBe(CREDIT_CAP);
  });

  it('accept_order non ha perso nessuna protezione nella ritaratura', () => {
    // Ridefinire una funzione intera per cambiare due numeri e' il momento in
    // cui e' facilissimo perdere per strada un controllo: e' gia' successo
    // scrivendo questa migrazione.
    const inizio = schema.lastIndexOf('create or replace function public.accept_order');
    const corpo = schema.slice(inizio, schema.indexOf('end; $$;', inizio));
    expect(corpo).toContain('if v_dist <= 50 then');          // GPS falsificato
    expect(corpo).toContain('pair_blocked(v_host, auth.uid())'); // blocco fra utenti
    expect(corpo).toContain('Non comprare nulla');            // copertura persa
    expect(corpo).toContain('for update');                    // riga bloccata
  });
});

describe('quanto costa davvero un giro', () => {
  // Casi concreti, per accorgersi se una modifica cambia i prezzi senza volerlo.
  const birre = (n: number, formato = '33cl') => [{ nome: 'x', quantita: n, formato }];

  it('sei birre piccole pesano poco piu di tre chili', () => {
    expect(orderWeightKg(birre(6))).toBeCloseTo(3.3, 2);
  });

  it('un giro piccolo sotto casa resta a buon mercato', () => {
    // La taratura del 01/09 non doveva toccare i giri piccoli: 3 come prima.
    expect(estimateCredits(birre(6))).toBe(3);
  });

  it('il giro pesante e lontano ora vale davvero di piu', () => {
    // 24 birre = 8 di peso; 5 km = 5 di distanza. Prima faceva 8 + 3 = 11,
    // tagliato a 10 dal vecchio tetto: quanto un giro medio.
    expect(estimateCredits(birre(24)) + estimateBonus(5)).toBe(13);
  });

  it('il tetto non si supera mai, comunque si carichi', () => {
    expect(estimateCredits(birre(200))).toBe(CREDIT_CAP);
  });

  it('la distanza pesa quanto dice la costante', () => {
    expect(estimateBonus(4)).toBe(Math.round(4 * CREDIT_PER_KM));
  });
});
