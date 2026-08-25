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

describe('il foglio resta da due tocchi', () => {
  const leggi = (rel: string) =>
    fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  const foglio = leggi('components/foglio-uscita.tsx');

  // Questo blocco difende il cantiere da se stesso. Ogni campo che qualcuno
  // vorra' aggiungere («che negozio? quante birre? quanto ti fermi?») sembrera'
  // utile, e uccidera' la spontaneita' — che e' tutto il punto. Se una di
  // queste asserzioni va fatta cadere, va fatta cadere apposta.

  it('non salva bozze: persiste la preferenza, non il contenuto', () => {
    // create-request.tsx ha una bozza persistita con debounce, ed e' la
    // confessione che compilarlo e' un lavoro. Qui si scrive su disco una cosa
    // sola — forma e durata, cioe' due scelte — e mai la nota.
    expect(foglio).toContain('btb:uscita.preferenza.v1');
    const scritture = foglio.match(/AsyncStorage\.setItem\([^)]*\)/g) ?? [];
    expect(scritture).toHaveLength(1);
    expect(scritture[0]).toContain('JSON.stringify({ forma, durata })');
    expect(scritture[0]).not.toContain('nota');
  });

  it('non chiede l indirizzo: lo prende dal telefono', () => {
    expect(foglio).toContain('getCurrentCoords');
    expect(foglio).not.toContain('LocationPickerMap');
  });

  it('rispetta il confine della citta come i giri e gli incontri', () => {
    expect(foglio).toContain('isWithinCity');
  });

  it('dice le due frasi che tolgono l esitazione', () => {
    // Dichiarare a un'app dove sei e' la cosa che fa esitare di piu'.
    expect(foglio).toContain('Puoi rientrare quando vuoi');
    expect(foglio).toContain('Si chiude da sola');
  });
});

describe('la barra ha quattro voci, e la terza non e una schermata', () => {
  const barra = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components/ui/app-tab-bar.tsx'), 'utf8');

  it('la voce FUORI e un azione, non una route', () => {
    // Registrarla come schermata lascerebbe una rotta fantasma apribile da un
    // deep link, che mostrerebbe il vuoto.
    expect(barra).toContain("kind: 'azione'");
    expect(barra).toContain("label: 'Fuori'");
  });

  it('«Home» non e piu la sola parola inglese della navigazione', () => {
    expect(barra).toContain("label: 'Giri'");
    const layout = fs.readFileSync(
      path.join(__dirname, '..', '..', 'app/(tabs)/_layout.tsx'), 'utf8');
    expect(layout).not.toContain("title: 'Home'");
  });

  it('icone e nomi stanno in una lista sola', () => {
    // Erano due strutture parallele che potevano divergere in silenzio.
    expect(barra).not.toContain('PRIMARY_TABS');
    expect(barra).not.toContain('TAB_ICONS');
  });
});

describe('il ponte fra un uscita e un giro', () => {
  const PONTE = fs.readFileSync(
    path.join(__dirname, '..', '..', 'supabase/migrations/20260909_giro_da_uscita.sql'), 'utf8');
  const api = fs.readFileSync(path.join(__dirname, '..', '..', 'data/api.ts'), 'utf8');

  it('il giro ricorda da dove viene', () => {
    expect(api).toContain('da_uscita_id: input.daUscitaId ?? null');
  });

  it('chi si era reso disponibile viene avvisato', () => {
    // Si e' esposta dicendo dove sarebbe stata: la cosa minima e' che sappia
    // che qualcuno le ha risposto.
    expect(PONTE).toContain('avvisa_uscita_risposta');
    expect(PONTE).toContain('perform public.avvisa(');
  });

  it('il blocco non si aggira da qui', () => {
    // La vista filtra pair_blocked, ma la vista non copre l'insert.
    expect(PONTE).toContain('pair_blocked(v_autore, new.host_id)');
  });

  it('un giro nato da un uscita costa come tutti gli altri', () => {
    // Premiare economicamente una forma sarebbe un algoritmo travestito da
    // gentilezza — e cambierebbe la formula in due posti.
    // Solo il codice: i commenti del file citano di proposito le funzioni che
    // NON tocca, ed e' giusto che restino a dirlo.
    const codice = PONTE.replace(/^\s*--.*$/gm, '');
    expect(codice).not.toContain('crediti_offerti');
    expect(codice).not.toContain('set_order_credits');
    expect(codice).not.toContain('accept_order');
  });

  it('si contano le richieste ricevute, mai le uscite dichiarate', () => {
    // Contando le dichiarazioni, chi si rende disponibile cinque volte senza
    // ricevere richieste risulterebbe «0 su 5»: sembrerebbe inaffidabile senza
    // colpa, e smetterebbe di dichiararsi. L'app punirebbe esattamente il
    // comportamento che vuole incoraggiare.
    expect(PONTE).toContain("'ricevute'");
    expect(PONTE).toContain('da_uscita_id');
  });
});
