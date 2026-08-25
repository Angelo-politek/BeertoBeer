import fs from 'fs';
import path from 'path';

/**
 * RIDEFINIRE UNA FUNZIONE NON DEVE FARLE PERDERE PEZZI.
 *
 * Postgres non sa sostituire una riga dentro una funzione: per cambiare due
 * numeri bisogna riscriverla tutta. E' il momento in cui si perdono i
 * controlli, e in questo progetto e' successo TRE VOLTE, sempre a me, sempre
 * nello stesso modo:
 *
 *   accept_order    - riscritta per ritarare i BeerCoin: persa la guardia dei
 *                     50 km contro il GPS falsificato e il messaggio «non
 *                     comprare nulla» di quando il giro non e' piu' coperto.
 *   push_to_users   - riscritta per aggiungere il canale Android: perso il
 *                     controllo «nessuno ha un telefono registrato» (che era
 *                     il motivo per cui quella diagnostica esiste), il
 *                     search_path che serve a net.http_post, e usata una
 *                     colonna di push_log che non esiste.
 *
 * Le prime due volte me ne sono accorto rileggendo. La terza volta no: se ne
 * e' accorto un test come questo. Da qui in avanti se ne accorge sempre lui.
 *
 * COME FUNZIONA. Per ogni funzione si elencano i pezzi che DEVONO esserci, e
 * si cerca nell'ULTIMA definizione presente nello SQL - quella che il database
 * esegue davvero dopo tutte le migrazioni.
 */

const RADICE = path.join(__dirname, '..', '..');

/** I file SQL nell'ordine in cui vengono eseguiti: schema, poi migrazioni per data. */
function fileSql(): { nome: string; testo: string }[] {
  const migrazioni = fs
    .readdirSync(path.join(RADICE, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return [
    { nome: 'schema.sql', testo: fs.readFileSync(path.join(RADICE, 'supabase/schema.sql'), 'utf8') },
    ...migrazioni.map((f) => ({
      nome: f,
      testo: fs.readFileSync(path.join(RADICE, 'supabase/migrations', f), 'utf8'),
    })),
  ];
}

const FILE = fileSql();
/** A capo, senza sequenze di escape: questo file ne ha gia' rotte tre. */
const A_CAPO = String.fromCharCode(10);

const sql = FILE.map((f) => f.testo).join(A_CAPO);

/**
 * Il corpo della funzione COM'E' DOPO tutte le migrazioni.
 *
 * Non basta prendere l'ultima definizione: una funzione puo' avere piu' firme
 * (push_to_users ne ha due, e la piu' recente e' solo un rimando all'altra).
 * Si prendono quindi TUTTE le definizioni di quel nome presenti nell'ultimo
 * file che la ridefinisce: insieme sono la versione viva.
 */
function definizioneViva(nome: string): string {
  const ancora = `create or replace function public.${nome}(`;
  const ultimo = [...FILE].reverse().find((f) => f.testo.includes(ancora));
  if (!ultimo) return '';

  const pezzi: string[] = [];
  let da = 0;
  for (;;) {
    const inizio = ultimo.testo.indexOf(ancora, da);
    if (inizio === -1) break;
    const fini = ['end $fn$;', 'end; $fn$;', 'end $$;', 'end; $$;']
      .map((f) => A_CAPO + f)
      .map((f) => ultimo.testo.indexOf(f, inizio))
      .filter((i) => i > -1);
    const fine = fini.length > 0 ? Math.min(...fini) : ultimo.testo.length;
    pezzi.push(ultimo.testo.slice(inizio, fine));
    da = fine + 1;
  }
  return pezzi.join(A_CAPO);
}

/** Cosa non deve sparire, e perche'. */
const DA_NON_PERDERE: { funzione: string; pezzi: { testo: string; perche: string }[] }[] = [
  {
    funzione: 'accept_order',
    pezzi: [
      { testo: 'if v_dist <= 50 then', perche: 'un GPS falsificato darebbe un bonus enorme' },
      { testo: 'pair_blocked(v_host, auth.uid())', perche: 'chi e bloccato vedrebbe l indirizzo di chi lo ha bloccato' },
      { testo: 'Non comprare nulla', perche: 'chi porta scoprirebbe di non essere pagato dopo aver comprato' },
      { testo: 'for update', perche: 'due persone potrebbero accettare lo stesso giro insieme' },
    ],
  },
  {
    funzione: 'push_to_users',
    pezzi: [
      {
        testo: 'nessun destinatario ha un telefono registrato',
        perche: 'e la diagnosi che ha spiegato perche le notifiche non arrivavano',
      },
      { testo: 'search_path = public, extensions', perche: 'net.http_post non si troverebbe' },
      { testo: 'sqlerrm', perche: 'un errore di invio sparirebbe in silenzio' },
      { testo: 'push_log', perche: 'e l unico modo di sapere a chi e andata una notifica' },
    ],
  },
  {
    funzione: 'set_order_credits',
    pezzi: [
      { testo: 'sospeso_fino', perche: 'un sospeso potrebbe lanciare giri' },
      { testo: 'available_credits', perche: 'si potrebbero promettere BeerCoin che non si hanno' },
      { testo: 'punto_in_citta', perche: 'tornerebbero gli indirizzi in provincia' },
      { testo: 'v_max_aperti', perche: 'sparirebbe il limite ai giri aperti' },
    ],
  },
  {
    funzione: 'segnala_problema_giro',
    pezzi: [
      { testo: 'congelato = true', perche: '«non mi sento al sicuro» non fermerebbe piu il giro' },
      { testo: 'is_admin', perche: 'gli amministratori non verrebbero avvisati' },
      { testo: 'order_issues', perche: 'si perderebbe la cronologia del giro' },
    ],
  },
  {
    funzione: 'guardie_giro',
    pezzi: [
      { testo: 'sospeso_fino', perche: 'un escluso potrebbe accettare giri e presentarsi a casa di qualcuno' },
      { testo: 'congelato', perche: 'un giro fermato per sicurezza ripartirebbe' },
    ],
  },
  {
    funzione: 'giro_pubblico',
    pezzi: [
      {
        testo: 'l.created_by = v.driver_id',
        perche: 'chi chiede potrebbe pubblicare a uno sconosciuto dove si trova chi porta',
      },
      { testo: "'revocato'", perche: 'un link revocato continuerebbe a funzionare' },
    ],
  },
];

describe('nessuna funzione perde pezzi quando viene ridefinita', () => {
  for (const { funzione, pezzi } of DA_NON_PERDERE) {
    describe(funzione, () => {
      const corpo = definizioneViva(funzione);

      it('esiste', () => {
        expect(corpo.length).toBeGreaterThan(50);
      });

      for (const { testo, perche } of pezzi) {
        it(`ha ancora: ${testo} — senza, ${perche}`, () => {
          expect(corpo).toContain(testo);
        });
      }
    });
  }
});

describe('le funzioni che mandano notifiche restano chiuse agli utenti', () => {
  it('avvisa e push_to_users non sono eseguibili da chi usa l app', () => {
    // In Postgres una funzione nuova e' eseguibile da PUBLIC per impostazione
    // predefinita: ogni volta che se ne ridefinisce una, la revoca va rifatta.
    // Senza, chiunque potrebbe mandare una push a tutti gli iscritti.
    const revoche = sql.match(/revoke all on function public\.(avvisa|push_to_users)/g) ?? [];
    expect(revoche.length).toBeGreaterThanOrEqual(3);
  });
});
