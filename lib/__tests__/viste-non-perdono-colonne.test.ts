import fs from 'fs';
import path from 'path';

/**
 * UNA VISTA NON DEVE PERDERE COLONNE QUANDO SI RICOSTRUISCE.
 *
 * `funzioni-non-perdono-pezzi.test.ts` protegge le funzioni. Le VISTE non le
 * protegge nessuno — ed e' esattamente da li' che e' passato l'incidente
 * peggiore del progetto, raccontato nell'intestazione di
 * `supabase/migrations/20260826_fix_feed.sql`:
 *
 *   l'app chiedeva `updated_at` a `open_requests`, la colonna era stata
 *   aggiunta alla vista in una migrazione eseguita PRIMA, e il database
 *   rispondeva «colonna inesistente». Feed e mappa restavano vuoti mostrando
 *   un errore di connessione — cioe' il difetto si presentava travestito da
 *   problema di rete, che e' il modo migliore per non farsi trovare.
 *
 * Il motivo per cui succede e' strutturale, non distrazione: una vista non si
 * puo' modificare a pezzi, va riscritta intera con `drop` + `create` (una
 * colonna in mezzo dà errore 42P16). Ogni ricostruzione e' quindi
 * un'occasione di dimenticare qualcosa.
 *
 * COME FUNZIONA. Per ogni vista letta dal client si prende l'ULTIMA
 * definizione presente nello SQL — quella che il database esegue davvero dopo
 * tutte le migrazioni — e si verifica che proietti tutte le colonne che
 * `data/api.ts` chiede per nome.
 */

const RADICE = path.join(__dirname, '..', '..');

function tuttoSql(): { nome: string; testo: string }[] {
  const dir = path.join(RADICE, 'supabase/migrations');
  const migrazioni = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  return [
    { nome: 'schema.sql', testo: fs.readFileSync(path.join(RADICE, 'supabase/schema.sql'), 'utf8') },
    ...migrazioni.map((f) => ({ nome: f, testo: fs.readFileSync(path.join(dir, f), 'utf8') })),
  ];
}

/** Il corpo dell'ultima `create view <nome>` in ordine di esecuzione. */
function vistaViva(nome: string): string {
  let ultima = '';
  for (const { testo } of tuttoSql()) {
    const re = new RegExp(`create\\s+(?:or\\s+replace\\s+)?view\\s+public\\.${nome}\\s+as([\\s\\S]*?);`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(testo)) !== null) ultima = m[1];
  }
  return ultima;
}

/** Le colonne proiettate: quello che sta fra `select` e `from`, per nome. */
function colonneProiettate(corpo: string): string[] {
  const select = corpo.slice(0, corpo.toLowerCase().lastIndexOf('\nfrom '));
  return select
    .replace(/^\s*select\s+/i, '')
    .split(/,\s*(?![^(]*\))/)
    .map((pezzo) => {
      // Via le righe di commento. Stanno SOPRA la colonna che descrivono, non
      // dopo: tagliare al primo «--» butterebbe via la colonna stessa.
      const pulito = pezzo
        .split('\n')
        .filter((riga) => !riga.trim().startsWith('--'))
        .join(' ')
        .trim();
      const alias = pulito.match(/\bas\s+([a-z_][a-z0-9_]*)\s*$/i);
      if (alias) return alias[1];
      const ultimo = pulito.split(/\s+/).pop() ?? '';
      // «u.nome» e «public.x» sono le stesse colonne di «nome» e «x».
      return ultimo.replace(/^[a-z_][a-z0-9_]*\./i, '').trim();
    })
    .filter(Boolean);
}

/** Le colonne che il client chiede, da una costante `X_COLUMNS` di data/api.ts. */
function colonneChieste(costante: string): string[] {
  const api = fs.readFileSync(path.join(RADICE, 'data/api.ts'), 'utf8');
  const m = api.match(new RegExp(`const ${costante}\\s*=\\s*\\n?\\s*'([^']+)'`));
  if (!m) throw new Error(`Costante ${costante} non trovata in data/api.ts`);
  return m[1].split(',').map((c) => c.trim()).filter(Boolean);
}

const COPPIE: { vista: string; costante: string; letta_da: string }[] = [
  { vista: 'open_requests', costante: 'ORDER_COLUMNS', letta_da: 'il feed e la mappa' },
  { vista: 'public_profiles', costante: 'PROFILE_COLUMNS', letta_da: 'ogni profilo mostrato' },
  { vista: 'uscite_aperte', costante: 'USCITA_COLUMNS', letta_da: 'chi e fuori adesso' },
];

describe('le viste proiettano tutto quello che il client chiede', () => {
  for (const { vista, costante, letta_da } of COPPIE) {
    describe(vista, () => {
      const corpo = vistaViva(vista);

      it('esiste', () => {
        expect(corpo.length).toBeGreaterThan(50);
      });

      const proiettate = colonneProiettate(corpo);
      for (const colonna of colonneChieste(costante)) {
        it(`proietta ${colonna} — senza, si spegne ${letta_da}`, () => {
          expect(proiettate).toContain(colonna);
        });
      }
    });
  }
});

describe('open_requests non perde le sue guardie', () => {
  const corpo = vistaViva('open_requests');

  it('arrotonda le coordinate', () => {
    // Senza, il feed pubblicherebbe il punto esatto di consegna: cioe'
    // l'indirizzo di casa di chi ha chiesto, a chiunque scorra la lista.
    expect(corpo).toMatch(/round\(lat::numeric, 2\)/);
    expect(corpo).toMatch(/round\(lng::numeric, 2\)/);
  });

  it('non restituisce mai l indirizzo', () => {
    expect(corpo).toMatch(/null::text as indirizzo/);
  });

  it('esclude chi e bloccato', () => {
    // Senza, chi hai bloccato torna nel tuo feed e puo' accettare i tuoi giri.
    expect(corpo).toContain('pair_blocked');
  });

  it('esclude le richieste oscurate', () => {
    expect(corpo).toContain("stato_moderazione = 'ok'");
  });

  it('esclude le richieste scadute', () => {
    // Il TTL vive in ttl_giro(). Se qui ricompare un `interval` scritto a mano,
    // significa che la scadenza e' tornata a stare in due posti diversi.
    expect(corpo).toContain('scade_il > now()');
  });

  it('esclude i giri fermati da una segnalazione', () => {
    expect(corpo).toContain('congelato');
  });
});

describe('il TTL di un giro vive in un posto solo', () => {
  const sql = tuttoSql().map((f) => f.testo).join('\n');

  it('ttl_giro() esiste e dichiara le 12 ore', () => {
    expect(sql).toMatch(/create or replace function public\.ttl_giro\(\)[\s\S]*?interval '12 hours'/);
  });

  it('REQUEST_TTL_HOURS lo rispecchia', () => {
    const ts = fs.readFileSync(path.join(RADICE, 'lib/orders.ts'), 'utf8');
    const m = ts.match(/REQUEST_TTL_HOURS = (\d+)/);
    expect(m?.[1]).toBe('12');
  });

  it('la vista del feed non ricalcola la scadenza a mano', () => {
    // Il numero stava in quattro posti: la vista, lib/orders.ts,
    // admin_dashboard_stats e la contabilita' dei crediti. Quattro copie sono
    // quattro occasioni di divergere, e la prima volta che divergono l'app
    // dice una cosa e il database ne fa un'altra.
    const vista = vistaViva('open_requests');
    expect(vista).not.toMatch(/interval '\d+ hours'/);
  });
});
