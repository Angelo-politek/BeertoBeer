import fs from 'fs';
import path from 'path';

import { FORME, MAX_ORE_USCITA, MAX_USCITE_APERTE, durateRapide, finoAlle } from '@/lib/uscite';

/**
 * LE USCITE, E I NUMERI CHE NON DEVONO DIVERGERE.
 *
 * Due costanti vivono sia in TypeScript sia nel SQL, di proposito: il client
 * deve poterle mostrare senza chiedere al server, e il server deve poterle far
 * rispettare senza fidarsi del client. Il patto e' che restino uguali, e in
 * questo progetto e' gia' successo tre volte che non lo restassero — l'ultima
 * con i BeerCoin, dove l'app diceva 10 e il database ne dava 5.
 *
 * Stesso schema di limiti-e-confini.test.ts e tolleranza-incontri.test.ts:
 * il test legge il .sql, che e' la fonte di verita'.
 */

const SQL = fs.readFileSync(
  path.join(__dirname, '..', '..', 'supabase/migrations/20260908_uscite.sql'),
  'utf8',
);

describe('i tetti dell app e quelli del database coincidono', () => {
  it('un uscita dura al massimo sei ore', () => {
    // E' la guardia piu' importante del modello: qui una persona dichiara
    // dove sara' e fino a quando. Sei ore sono una serata; piu' a lungo non
    // e' una serata, e' la sua posizione pubblicata.
    const m = SQL.match(/v_max_ore\s+constant integer\s*:=\s*(\d+)/);
    expect(m?.[1]).toBe(String(MAX_ORE_USCITA));
  });

  it('non si e fuori in cinque modi insieme', () => {
    const m = SQL.match(/v_max_aperte\s+constant integer\s*:=\s*(\d+)/);
    expect(m?.[1]).toBe(String(MAX_USCITE_APERTE));
  });

  it('le tre facce dell app sono le tre facce del vincolo SQL', () => {
    // Se ne aggiungessi una in TypeScript senza toccare il check, l'insert
    // fallirebbe con un errore di vincolo che nessuno saprebbe leggere.
    const m = SQL.match(/check \(tipo in \(([^)]+)\)\)/);
    const daSql = (m?.[1] ?? '').split(',').map((s) => s.trim().replace(/'/g, ''));
    expect(daSql.sort()).toEqual(FORME.map((f) => f.key).sort());
  });
});

describe('la vista pubblica non racconta piu del dovuto', () => {
  it('arrotonda le coordinate', () => {
    // Senza, si pubblicherebbe il punto esatto da cui una persona ha detto
    // «sono qui» — che spesso e' casa sua.
    expect(SQL).toMatch(/round\(lat::numeric, 2\)/);
    expect(SQL).toMatch(/round\(lng::numeric, 2\)/);
  });

  it('esclude chi e bloccato', () => {
    expect(SQL).toContain('pair_blocked(autore_id, auth.uid())');
  });

  it('esclude le uscite finite senza bisogno di un processo', () => {
    expect(SQL).toContain('finisce_alle > now()');
  });

  it('esclude le uscite congelate e quelle oscurate', () => {
    expect(SQL).toContain('not congelata');
    expect(SQL).toContain("stato_moderazione = 'ok'");
  });
});

describe('le scritture passano dalle funzioni, non dalle policy', () => {
  it('non esiste nessuna policy di insert, update o delete su uscite', () => {
    // Le regole (sospensione, confine, tetti, durata) stanno in un posto solo.
    // Una policy `with check` in piu' sarebbe un secondo posto in cui
    // ricordarsele.
    expect(SQL).not.toMatch(/create policy[^;]*on public\.uscite\s+for (insert|update|delete)/i);
  });

  it('la tabella ha comunque la RLS accesa', () => {
    expect(SQL).toContain('alter table public.uscite enable row level security');
  });
});

describe('la logica pura', () => {
  it('le durate rapide non sforano mai il tetto', () => {
    const ora = new Date('2026-09-08T20:00:00Z');
    for (const d of durateRapide(ora)) {
      const ore = (d.fino.getTime() - ora.getTime()) / 3_600_000;
      expect(ore).toBeLessThanOrEqual(MAX_ORE_USCITA);
      expect(ore).toBeGreaterThan(0);
    }
  });

  it('l orario si legge come lo direbbe una persona', () => {
    const tondo = new Date('2026-09-08T23:00:00');
    const spezzato = new Date('2026-09-08T23:30:00');
    expect(finoAlle(tondo.toISOString())).toBe('fino alle 23');
    expect(finoAlle(spezzato.toISOString())).toBe('fino alle 23:30');
  });

  it('ogni faccia ha una frase in prima persona e una parola sola', () => {
    // La frase e' quella che stai per pronunciare tu; la parola sola serve
    // dove non c'e' spazio (chip, filtro, mappa).
    for (const f of FORME) {
      expect(f.titolo.length).toBeGreaterThan(5);
      expect(f.breve.split(' ')).toHaveLength(1);
      expect(f.spiega.length).toBeGreaterThan(20);
    }
  });
});
