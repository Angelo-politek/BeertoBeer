import fs from 'fs';
import path from 'path';

import { MINUTI_TOLLERANZA_INCONTRO, incontroInCorso, sogliaIncontriVisibili } from '@/lib/events';

/**
 * UN ELENCO NON PUÒ PROMETTERE QUELLO CHE IL DATABASE RIFIUTA.
 *
 * `getEvents` elencava gli incontri fino a 6 ore dopo l'orario di inizio, ma
 * `join_event_v21` li rifiutava appena `quando <= now()`. Per sei ore
 * l'incontro restava in bacheca e sulla mappa, e chi provava a unirsi riceveva
 * un errore — per giunta muto, perché la schermata sostituiva il messaggio del
 * database con «Operazione non riuscita».
 *
 * È lo stesso difetto della chat che si bloccava sullo stato 'arrivato': un
 * elenco aggiornato da una parte e non dall'altra. Due volte la stessa classe
 * di errore significa che serve un test, non un'altra correzione puntuale.
 */

const RADICE = path.join(__dirname, '..', '..');
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf8');

describe('tolleranza degli incontri', () => {
  it('app e database aspettano lo stesso tempo', () => {
    const migrazione = leggi('supabase/migrations/20260830_tolleranza_incontri.sql');

    // Si isola la condizione di scadenza dentro la funzione, non tutto il
    // file: cercare "6 hours" ovunque farebbe passare il test anche se la
    // condizione vera dicesse un'altra cosa.
    const riga = migrazione
      .split('\n')
      .find((l) => l.includes('e.quando <=') && l.includes('interval'));
    expect(riga).toBeDefined();

    const ore = riga?.match(/interval\s+'(\d+)\s+hours?'/)?.[1];
    expect(ore).toBeDefined();
    expect(Number(ore) * 60).toBe(MINUTI_TOLLERANZA_INCONTRO);
  });

  it("l'elenco degli incontri usa la soglia condivisa, non un numero scritto a mano", () => {
    const api = leggi('data/api.ts');
    expect(api).toContain('sogliaIncontriVisibili()');
    // Il vecchio calcolo scritto a mano dentro la query.
    expect(api).not.toContain('6 * 3600 * 1000');
  });

  it('la soglia sta indietro esattamente della tolleranza', () => {
    const adesso = new Date('2026-08-24T23:22:00Z').getTime();
    const soglia = sogliaIncontriVisibili(adesso).getTime();
    expect((adesso - soglia) / 60000).toBe(MINUTI_TOLLERANZA_INCONTRO);
  });
});

describe('incontro in corso', () => {
  // L'ora del collaudo che ha fatto emergere il difetto.
  const adesso = new Date('2026-08-24T23:22:00Z').getTime();
  const ore = (n: number) => new Date(adesso + n * 3600 * 1000).toISOString();

  it('un incontro futuro non è «in corso»', () => {
    expect(incontroInCorso(ore(2), adesso)).toBe(false);
  });

  it('è questo il caso che aveva rotto tutto: cominciato da poco, ancora valido', () => {
    // Alle 21:00, collaudato alle 23:22: due ore e mezza prima.
    expect(incontroInCorso(ore(-2.37), adesso)).toBe(true);
  });

  it('oltre la tolleranza non è più in corso: è finito', () => {
    expect(incontroInCorso(ore(-7), adesso)).toBe(false);
  });
});
