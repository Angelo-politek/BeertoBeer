import fs from 'fs';
import path from 'path';

/**
 * NON SI SCRIVE IN UNA TABELLA CHE NESSUNO LEGGE.
 *
 * E' il difetto piu' ricorrente di questo progetto, e ogni volta e' sembrato
 * un bug diverso mentre era sempre lo stesso: un capo del filo collegato e
 * l'altro no.
 *
 *   order_issues            - «non mi sento al sicuro» ci scriveva dentro, e
 *                             nessuna schermata l'ha mai letta. Qualcuno puo'
 *                             aver chiesto aiuto sotto casa di uno sconosciuto
 *                             senza che nessuno lo sapesse.
 *   order_trusted_contacts  - il nome e il numero di una persona cara,
 *                             salvati e mai usati. Prometteva una protezione
 *                             che non esisteva.
 *   notification_inbox      - l'app ci contava sopra il pallino rosso della
 *                             campanella, e NESSUNO ci ha mai scritto niente.
 *
 * Tre volte. Da qui in avanti: se una tabella raccoglie roba che serve a una
 * persona, ci deve essere anche il codice che gliela mostra, e questo test
 * fallisce se il collegamento sparisce.
 */

const RADICE = path.join(__dirname, '..', '..');
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf8');

/** Tutto il codice dell'app: schermate, componenti, accesso ai dati. */
function codiceApplicazione(): string {
  const pezzi: string[] = [];
  const cartelle = ['app', 'components', 'data', 'lib'];
  const visita = (dir: string) => {
    for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
      if (voce.name === '__tests__' || voce.name.startsWith('.')) continue;
      const completo = path.join(dir, voce.name);
      if (voce.isDirectory()) visita(completo);
      else if (/\.tsx?$/.test(voce.name)) pezzi.push(fs.readFileSync(completo, 'utf8'));
    }
  };
  for (const c of cartelle) visita(path.join(RADICE, c));
  return pezzi.join('\n');
}

const codice = codiceApplicazione();

/**
 * Le cose che qualcuno raccoglie e qualcun altro deve poter vedere.
 * `raccolta` = come finiscono dentro. `lettura` = come tornano fuori.
 */
const CATENE = [
  {
    nome: 'una segnalazione durante un giro arriva a chi la deve leggere',
    raccolta: 'segnala_problema_giro',
    lettura: ['getAdminReports'],
  },
  {
    nome: 'una segnalazione su una persona arriva a chi la deve leggere',
    raccolta: 'segnala_utente',
    lettura: ['getAdminReports'],
  },
  {
    nome: 'chi e stato segnalato puo vedere la segnalazione e rispondere',
    raccolta: 'rispondi_a_segnalazione',
    lettura: ['getMieSegnalazioni'],
  },
  {
    nome: 'i provvedimenti hanno una schermata che li applica',
    raccolta: 'admin_provvedimento',
    lettura: ['adminProvvedimento'],
  },
  {
    nome: 'il link pubblico si crea e si puo mandare',
    raccolta: 'crea_link_giro',
    lettura: ['creaLinkGiro'],
  },
];

describe('ogni dato raccolto ha qualcuno che lo legge', () => {
  it.each(CATENE)('$nome', ({ raccolta, lettura }) => {
    expect(codice).toContain(raccolta);
    for (const funzione of lettura) {
      expect(codice).toContain(funzione);
    }
  });
});

describe('la casella delle notifiche non e piu muta', () => {
  const migrazione = leggi('supabase/migrations/20260902_segnalazioni.sql');

  it('esiste una funzione che scrive davvero in notification_inbox', () => {
    // Il pallino rosso sulla campanella contava le righe di una tabella in cui
    // non scriveva nessuno: mostrava sempre zero, qualsiasi cosa succedesse.
    expect(migrazione).toContain('insert into public.notification_inbox');
  });

  it('avvisare scrive in casella E manda la push, non una sola delle due', () => {
    const inizio = migrazione.indexOf('create or replace function public.avvisa');
    const corpo = migrazione.slice(inizio, migrazione.indexOf('$fn$;', inizio));
    expect(corpo).toContain('notification_inbox');
    expect(corpo).toContain('push_to_users');
  });

  it("l'app legge la casella", () => {
    expect(leggi('data/api.ts')).toContain("from('notification_inbox')");
  });
});

describe('il contatto fidato non promette piu protezioni che non da', () => {
  it('non si scrive piu in una tabella che nessuno legge', () => {
    expect(codice).not.toContain("from('order_trusted_contacts')");
  });
});

describe('chi puo far partire una notifica', () => {
  const migrazione = leggi('supabase/migrations/20260902_segnalazioni.sql');

  it('avvisa e push_to_users non sono chiamabili dagli utenti', () => {
    // In Postgres una funzione nuova e' eseguibile da PUBLIC per impostazione
    // predefinita: push_to_users non era mai stata revocata, quindi qualsiasi
    // utente registrato poteva mandare una push a chiunque, col testo che
    // voleva. Senza queste revoche la falla resta aperta.
    expect(migrazione).toMatch(/revoke all on function public\.avvisa[\s\S]*?from public, anon, authenticated;/);
    expect(migrazione).toMatch(/revoke all on function public\.push_to_users[\s\S]*?from public, anon, authenticated;/);
  });
});
