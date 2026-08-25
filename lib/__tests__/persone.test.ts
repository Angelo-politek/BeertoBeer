import fs from 'fs';
import path from 'path';

/**
 * INCONTRI, EVENTI E AMICI.
 *
 * Le tre segnalazioni del collaudo su questa parte chiedevano cose che
 * sembrano piccole e invece toccano la riservatezza delle persone. Questo test
 * tiene ferme le scelte che sono state prese apposta.
 */

const RADICE = path.join(__dirname, '..', '..');
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf8');
const migrazione = leggi('supabase/migrations/20260905_persone.sql');

describe('la chat di gruppo non e una chat nuova', () => {
  it('riusa il componente delle altre chat', () => {
    // Scriverne una seconda avrebbe voluto dire due chat che col tempo si
    // comportano in modo diverso: e' il difetto che in questo progetto ho gia'
    // rincorso tre volte (il glossario, la formula dei crediti, gli stati).
    const schermata = leggi('app/chat/evento/[id].tsx');
    expect(schermata).toContain("from '@/components/chat-view'");
    expect(schermata).toContain('<ChatView');
  });

  it('a decidere chi puo scrivere e il database, non la schermata', () => {
    // Nascondere il pulsante non e' una protezione: chiunque puo' chiamare
    // l'API direttamente.
    const inizio = migrazione.indexOf('create policy "event_messages_partecipanti_scrivono"');
    const regola = migrazione.slice(inizio, migrazione.indexOf(';', inizio));
    expect(regola).toContain('sender_id = auth.uid()');
    expect(regola).toContain('event_participants');
    // E non si scrive su un incontro gia' chiuso.
    expect(regola).toContain("e.stato = 'aperto'");
  });
});

describe('gli amici', () => {
  it('non si diventa amici senza che l altro accetti', () => {
    // Il punto della segnalazione era proprio questo: «meccanismo con
    // richiesta di amicizia da accettare».
    // Regex e non testo esatto: l'allineamento delle colonne nel file SQL non
    // deve poter far fallire un test che parla di comportamento.
    expect(migrazione).toMatch(/stato\s+text not null default 'in_attesa'/);
    expect(migrazione).toContain('rispondi_amicizia');
  });

  it('nessuno puo scrivere direttamente nella tabella', () => {
    // Le regole permettono solo di LEGGERE le proprie: creare e accettare
    // passano dalle funzioni, che sanno controllare i blocchi e avvisare.
    const inizio = migrazione.indexOf('create policy "amicizie_mie"');
    const regola = migrazione.slice(inizio, migrazione.indexOf(';', inizio));
    expect(regola).toContain('for select');
    expect(migrazione).not.toMatch(/create policy "amicizie[^"]*" on public\.amicizie\s+for insert/);
  });

  it('chi ha bloccato qualcuno non puo farsi vivo con una richiesta', () => {
    // Una richiesta di amicizia e' comunque un modo di farsi vivo: senza
    // questo controllo, il blocco si aggirerebbe da qui.
    const inizio = migrazione.indexOf('create or replace function public.chiedi_amicizia');
    const corpo = migrazione.slice(inizio, migrazione.indexOf('end $fn$;', inizio));
    expect(corpo).toContain('pair_blocked');
  });

  it('rifiutare non manda nessun avviso a chi ha chiesto', () => {
    // Dire a qualcuno che e' stato rifiutato non serve a niente e fa solo
    // male: la notifica parte solo se si accetta.
    const inizio = migrazione.indexOf('create or replace function public.rispondi_amicizia');
    const corpo = migrazione.slice(inizio, migrazione.indexOf('end $fn$;', inizio));
    expect(corpo).toContain('if p_accetta then');
  });

  it('gli amici restano una cosa sociale, non toccano i giri', () => {
    // Deciso con Alessio: con poche persone in citta', giri riservati agli
    // amici frammenterebbero una beta gia' piccola. Se un domani si cambia
    // idea, questo test va cambiato apposta e non per sbaglio.
    const feed = leggi('data/api.ts');
    const inizio = feed.indexOf('export async function getDiscoveryRequests');
    const corpo = inizio > -1 ? feed.slice(inizio, inizio + 2000) : '';
    expect(corpo).not.toContain('sono_amici');
    expect(corpo).not.toContain('amicizie');
  });
});

describe('incontro ed evento sono due cose distinte', () => {
  it('il database conosce solo questi due tipi', () => {
    expect(migrazione).toContain("check (tipo in ('incontro', 'evento'))");
  });

  it('gli incontri gia esistenti restano incontri', () => {
    // Senza il valore predefinito, una colonna nuova su righe vecchie sarebbe
    // nulla, e il vincolo non le farebbe piu' aggiornare.
    expect(migrazione).toContain("add column if not exists tipo text not null default 'incontro'");
  });

  it('la locandina finisce in un posto scrivibile solo dal proprietario', () => {
    const inizio = migrazione.indexOf('create policy "eventi_scrittura_propria"');
    const regola = migrazione.slice(inizio, migrazione.indexOf(';', inizio));
    // La cartella e' l'id di chi carica: senza, si potrebbe sovrascrivere la
    // locandina di un altro.
    expect(regola).toContain('(storage.foldername(name))[1] = auth.uid()::text');
  });
});

describe('il profilo altrui', () => {
  it('mostra la vetrina dove si guarda davvero, non mentre carica', () => {
    // Il difetto trovato leggendo il codice: ProfileShowcase era dentro il
    // ramo `if (loading)`, quindi non lo vedeva nessuno.
    const profilo = leggi('app/user/[id].tsx');
    const ramoLoading = profilo.slice(profilo.indexOf('if (loading) {'), profilo.indexOf('if (!user) {'));
    expect(ramoLoading).not.toContain('ProfileShowcase');
    expect(profilo).toContain('<ProfileShowcase');
  });

  it('le foto si aprono', () => {
    expect(leggi('app/user/[id].tsx')).toContain('FotoIntera');
    expect(leggi('components/profile-showcase.tsx')).toContain('onApriFoto');
  });

  it('«founder» si decide a mano, non si deduce', () => {
    // Dedurlo da «e' fra i primi iscritti» sarebbe sbagliato: i primi iscritti
    // di una beta sono solo i primi arrivati.
    expect(migrazione).toContain('add column if not exists founder boolean not null default false');
  });
});
