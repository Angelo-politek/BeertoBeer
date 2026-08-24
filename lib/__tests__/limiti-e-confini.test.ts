import fs from 'fs';
import path from 'path';

import { CITIES } from '@/lib/cities';
import { birreTotali, MAX_BIRRE_PER_GIRO, MAX_GIRI_AL_GIORNO, MAX_GIRI_APERTI } from '@/lib/limiti';

/**
 * I LIMITI LI APPLICA IL DATABASE. L'APP LI RIPETE, E DEVONO COINCIDERE.
 *
 * Segnalazioni del collaudo: «da mettere un limite di richieste per evitare
 * spam, limitare anche la spesa massima (non si possono ordinare 50 birre)» e
 * «le posizioni inserite devono essere nel raggio della città! Ho provato a
 * mettere un indirizzo in provincia e lo ha accettato».
 *
 * Prima di questa versione non esisteva NESSUN limite in tutto lo schema, e il
 * controllo del confine città viveva soltanto dentro l'app — cioè non era un
 * controllo: bastava una richiesta fatta a mano, o una versione vecchia
 * dell'app, per aggirarlo.
 *
 * Ora i numeri stanno in due posti per forza (SQL per applicarli, TypeScript
 * per avvisare prima di premere «Pubblica»). Due posti significa che possono
 * divergere: questo test lo impedisce.
 */

const RADICE = path.join(__dirname, '..', '..');
const MIGRAZIONE = path.join(RADICE, 'supabase/migrations/20260831_regole_e_limiti.sql');
const sql = fs.readFileSync(MIGRAZIONE, 'utf8');

/** Il valore di una costante dichiarata nel plpgsql, es. `v_max_birre constant integer := 24;` */
function costanteSql(nome: string): number {
  const trovato = sql.match(new RegExp(`${nome}\\s+constant\\s+integer\\s*:=\\s*(\\d+)`));
  expect(trovato).not.toBeNull();
  return Number(trovato![1]);
}

describe('i limiti dell app e quelli del database coincidono', () => {
  it('giri contemporaneamente aperti', () => {
    expect(costanteSql('v_max_aperti')).toBe(MAX_GIRI_APERTI);
  });

  it('giri lanciabili in 24 ore', () => {
    expect(costanteSql('v_max_giorno')).toBe(MAX_GIRI_AL_GIORNO);
  });

  it('birre per giro', () => {
    expect(costanteSql('v_max_birre')).toBe(MAX_BIRRE_PER_GIRO);
  });
});

describe('confini delle città', () => {
  /** Le righe di `insert into public.city_bounds ... values (...)`. */
  const righe = [...sql.matchAll(/\('([a-z]+)',\s*'([^']+)',\s*([\d.]+),\s*([\d.]+),\s*(\d+)\)/g)].map(
    (m) => ({ key: m[1], label: m[2], lat: Number(m[3]), lng: Number(m[4]), radiusKm: Number(m[5]) }),
  );

  it('la migrazione dichiara tutte le città che conosce l app', () => {
    expect(righe.map((r) => r.key).sort()).toEqual(CITIES.map((c) => c.key).sort());
  });

  it.each(CITIES)('$label ha lo stesso centro e lo stesso raggio nei due posti', (city) => {
    const riga = righe.find((r) => r.key === city.key);
    expect(riga).toBeDefined();
    expect(riga!.radiusKm).toBe(city.radiusKm);
    expect(riga!.lat).toBeCloseTo(city.center.lat, 4);
    expect(riga!.lng).toBeCloseTo(city.center.lng, 4);
  });

  it('il raggio di Torino non arriva più in provincia', () => {
    // A 15 km il cerchio comprendeva Rivoli (~13 km) e Nichelino (~9 km).
    // Non è una separazione perfetta — nessun cerchio lo è — ma 15 era troppo.
    const torino = CITIES.find((c) => c.key === 'torino')!;
    expect(torino.radiusKm).toBeLessThanOrEqual(12);
  });
});

describe('conteggio delle birre', () => {
  it('somma le quantità, non le righe', () => {
    expect(birreTotali([{ quantita: 6 }, { quantita: 12 }])).toBe(18);
  });

  it('una riga senza quantità vale una birra, non zero', () => {
    expect(birreTotali([{}, { quantita: '' }])).toBe(2);
  });

  it('il caso della segnalazione: 50 birre superano il tetto', () => {
    expect(birreTotali([{ quantita: 50 }])).toBeGreaterThan(MAX_BIRRE_PER_GIRO);
  });
});

describe('struttura della migrazione', () => {
  // Non sostituisce Postgres, ma intercetta gli errori che ho già commesso
  // scrivendola: apostrofi che chiudono una stringa a metà frase.
  it('nessuna riga di codice ha apostrofi spaiati', () => {
    const colpevoli = sql
      .split('\n')
      .map((riga, i) => ({ n: i + 1, riga }))
      .filter(({ riga }) => !riga.trimStart().startsWith('--'))
      .filter(({ riga }) => (riga.match(/'/g)?.length ?? 0) % 2 !== 0);
    expect(colpevoli.map((c) => `${c.n}: ${c.riga.trim()}`)).toEqual([]);
  });

  it('ogni funzione dichiarata è anche concessa agli utenti', () => {
    const dichiarate = [...sql.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1]);
    const concesse = [...sql.matchAll(/grant execute on function public\.(\w+)\(/g)].map((m) => m[1]);
    // I trigger non si concedono: girano per conto del database.
    const trigger = ['set_order_credits', 'check_event_in_citta'];
    for (const nome of dichiarate) {
      if (trigger.includes(nome)) continue;
      expect(concesse).toContain(nome);
    }
  });

  it('le delimitazioni $fn$ sono in numero pari', () => {
    expect((sql.match(/\$fn\$/g)?.length ?? 0) % 2).toBe(0);
  });
});
