import fs from 'fs';
import path from 'path';

import { nextOrderAction } from '@/lib/discovery';
import { giroChiuso, motivoNonAgibile } from '@/lib/orders';
import type { BeerRequest } from '@/types';

/**
 * LE SEI COSE CHE IL COLLAUDO HA TROVATO, CONGELATE IN UN TEST.
 *
 * Ogni blocco qui sotto corrisponde a una segnalazione scritta a mano da chi
 * ha provato l'app su un telefono vero. Non sono ipotesi: sono cose che sono
 * successe, e questo file esiste perche' non succedano una seconda volta.
 */

const RADICE = path.join(__dirname, '..', '..');
/** I commenti citano di proposito cio che e stato tolto: le asserzioni guardano il codice. */
const senzaCommentiFile = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf8');

function giro(extra: Partial<BeerRequest> = {}): BeerRequest {
  return {
    id: 'g1',
    host: { id: 'h1' } as BeerRequest['host'],
    driverId: null,
    birre: [],
    indirizzo: '',
    stato: 'richiesto',
    vibeMode: false,
    creditiOfferti: 3,
    hostConfermato: false,
    driverConfermato: false,
    createdAt: new Date().toISOString(),
    statoModerazione: 'ok',
    congelato: false,
    ...extra,
  };
}

describe('un giro fermo non ha una prossima azione', () => {
  it('«non mi sento al sicuro» toglie i pulsanti invece di lasciarli fallire', () => {
    // Prima: la schermata restava identica e i pulsanti lanciavano l'eccezione
    // grezza del trigger («Questo giro e fermo...») dentro un alert.
    const fermo = giro({ stato: 'arrivato', congelato: true, driverId: 'd1' });
    expect(motivoNonAgibile(fermo)).toContain('segnalazione');
    expect(nextOrderAction(fermo, 'd1').key).toBe('open');
    expect(nextOrderAction(fermo, 'd1').priority).toBe(0);
  });

  it('un giro rimosso dalla moderazione non e piu attivo', () => {
    // Segnalazione del collaudo: «giro rimosso per segnalazione rimane segnato
    // come ancora attivo nel feed per l'utente che aveva creato il giro».
    const rimosso = giro({ statoModerazione: 'rimosso' });
    expect(giroChiuso(rimosso)).toBe(true);
    expect(nextOrderAction(rimosso, 'h1').key).toBe('open');
  });

  it('un giro oscurato dice che e in verifica, non «in attesa»', () => {
    expect(motivoNonAgibile(giro({ statoModerazione: 'oscurato' }))).toBe('In verifica');
  });

  it('un giro scaduto non conta piu fra quelli aperti', () => {
    const vecchio = giro({ createdAt: new Date(Date.now() - 13 * 3600_000).toISOString() });
    expect(giroChiuso(vecchio)).toBe(true);
  });

  it('un giro normale resta agibile', () => {
    expect(motivoNonAgibile(giro())).toBeNull();
    expect(giroChiuso(giro())).toBe(false);
    expect(nextOrderAction(giro({ stato: 'accettato', driverId: 'd1' }), 'd1').key).toBe('start');
  });
});

describe('la home e i miei giri usano lo stesso criterio', () => {
  it('la home non filtra piu solo sullo stato', () => {
    // Il banner «GIRO ATTIVO» guardava solo `stato`: un giro rimosso, oscurato
    // o scaduto compariva in cima alla schermata iniziale come se fosse vivo.
    const home = leggi('app/(tabs)/index.tsx');
    expect(home).toContain('giroChiuso');
    expect(home).not.toMatch(/filter\(\(order\) => !\['confermato', 'annullato'\]/);
  });

  it('my-orders non ha piu un criterio suo', () => {
    expect(leggi('app/my-orders.tsx')).toContain('const isClosed = giroChiuso');
  });
});

describe('chi lancia un giro sa chi sta arrivando a casa sua', () => {
  it('i profili risolti sono due, non uno', () => {
    // Segnalazione del collaudo: «non si vede il profilo di chi ha accettato
    // la consegna». withHosts risolveva solo host_id.
    const api = leggi('data/api.ts');
    expect(api).toMatch(/fetchProfiles\(rows\.flatMap\(\(r\) => \[r\.host_id, r\.driver_id/);
    expect(api).toContain('persone.get(r.driver_id)');
  });

  it('congelato arriva davvero al client', () => {
    // Esisteva in SQL dal 20260902 e non e mai stato selezionato: senza la
    // colonna, tutta la logica qui sopra sarebbe stata cieca.
    expect(leggi('data/api.ts')).toContain('citta, stato_moderazione, congelato');
  });
});

describe('il pulsante «invia» della segnalazione resta raggiungibile', () => {
  const modale = leggi('components/report-modal.tsx');

  // Segnalazione del collaudo: «se il messaggio di segnalazione e molto lungo
  // la pagina non permette di scorrere verso il basso per intercettare il
  // pulsante invia». E' la peggiore di tutte, perche' tappa il canale da cui
  // arrivano le altre segnalazioni.
  it('il contenuto sta dentro uno ScrollView', () => {
    expect(modale).toContain('<ScrollView');
  });

  it('il foglio ha un tetto di altezza', () => {
    expect(modale).toMatch(/maxHeight: '85%'/);
  });

  it('il foglio e ancorato in basso, non centrato', () => {
    // Solo il blocco degli stili: il commento in cima al file cita di
    // proposito il vecchio `center`, ed e giusto che resti a raccontarlo.
    const stili = modale.slice(modale.indexOf('StyleSheet.create('));
    expect(stili).toMatch(/justifyContent: .flex-end./);
    expect(stili).not.toMatch(/justifyContent: .center./);
  });

  it('la tastiera non ruba il tocco ai pulsanti', () => {
    expect(modale).toContain('keyboardShouldPersistTaps="handled"');
  });
});

describe('gli amici si trovano', () => {
  it('il profilo porta agli amici in un tocco', () => {
    // Erano a tre tocchi, dentro Impostazioni, sotto una card intitolata
    // «Sicurezza»: l'unico riferimento a /amici in tutto il progetto.
    expect(leggi('app/(tabs)/profile.tsx')).toContain("router.push('/amici'");
  });
});

describe('un aggiornamento si annuncia', () => {
  it('il flag si scrive PRIMA del riavvio', () => {
    // reloadAsync() distrugge tutto lo stato React: se il ricordo non e su
    // disco prima, dopo il riavvio non esiste piu nessun ponte.
    const layout = leggi('app/_layout.tsx');
    const iScrittura = layout.indexOf('segnaAggiornamentoInArrivo');
    const iReload = layout.indexOf('Updates.reloadAsync()');
    expect(iScrittura).toBeGreaterThan(-1);
    expect(iScrittura).toBeLessThan(iReload);
  });

  it('chi ha appena installato non vede le novita di un app che non ha usato', () => {
    expect(leggi('components/novita-banner.tsx')).toContain('haGiaVistoUnaVersione');
  });

  it('il diario esiste e ha una voce', () => {
    expect(leggi('constants/novita.ts')).toContain('NOVITA');
  });
});

describe('un admin puo chiudere un giro', () => {
  it('la scheda esiste e usa la funzione che era orfana', () => {
    // adminCancelOrder stava in data/api.ts da settembre, esposta e importata
    // da nessuna schermata: un amministratore non poteva chiudere un giro.
    const schermata = leggi('app/admin/giri.tsx');
    expect(schermata).toContain('adminCancelOrder');
    expect(schermata).toContain('adminGetActiveOrders');
    expect(leggi('app/admin/index.tsx')).toContain("/admin/giri");
  });
});

describe('i numeri non mentono piu', () => {
  const branding = leggi('constants/branding.ts');

  it('le costanti morte e sbagliate sono sparite', () => {
    // Dicevano 10 dove il database ne dava 5, e 5 dove ne coniava 5+5 mentre
    // lib/credits.ts diceva 3. Nessuno le leggeva: per questo erano rimaste
    // sbagliate per mesi.
    expect(branding).not.toMatch(/export const WELCOME_TOKENS/);
    expect(branding).not.toMatch(/export const REFERRAL_TOKENS/);
    expect(branding).not.toMatch(/export const NIGHT_BONUS_PT/);
  });

  it('la versione nel feedback non e piu scritta a mano', () => {
    // Ogni segnalazione della beta era etichettata 'V2.1', qualunque fosse la
    // versione vera: la prima cosa che si guarda leggendo un bug.
    expect(leggi('data/api.ts')).not.toContain("'V2.1'");
  });

  it('il commento dei limiti non cita un tetto che non esiste', () => {
    expect(leggi('lib/limiti.ts')).not.toContain('si fermano a 10');
  });
});

describe('le parole a schermo hanno gli accenti', () => {
  const CADUTE = [
    'Chi c e<',
    'Non ci vado piu<',
    'CONOSCI GIA<',
    'Mettetevi d accordo',
    'Non siete piu amici',
    'La tua versione e stata inviata',
  ];

  it('nessuna delle stringhe note e ancora monca', () => {
    const tutto = ['app/event/[id].tsx', 'app/amici.tsx', 'app/chat/evento/[id].tsx',
      'app/segnalazione/[id].tsx', 'app/user/[id].tsx']
      .map(leggi).join('\n');
    for (const c of CADUTE) expect(tutto).not.toContain(c.replace('<', ''));
  });
});

describe('più community, meno algoritmi', () => {
  // La mission della brand bible, presa alla lettera. Questo blocco e' la
  // decisione piu' politica del progetto: senza, `smartScore` torna fra tre
  // mesi con un altro nome, e chi lo fa fallire deve prendersi la
  // responsabilita' di averlo voluto.
  // I commenti di questi file citano di proposito cio' che e' stato tolto —
  // e' cosi' che il codice racconta le proprie decisioni. Le asserzioni
  // guardano solo il codice vero.
  const senzaCommenti = (t: string) =>
    t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const discovery = senzaCommenti(leggi('lib/discovery.ts'));

  it('smartScore non esiste piu', () => {
    expect(discovery).not.toMatch(/export function smartScore/);
  });

  it('nessuna funzione di ordinamento legge il rating', () => {
    // ratingMedio * 4 era il termine dominante, e rating_medio parte da zero:
    // un nuovo iscritto partiva venti punti sotto, cioe' dodici chilometri.
    const ordinamento = discovery.slice(discovery.indexOf('export function sortDiscovery'));
    expect(ordinamento).not.toContain('ratingMedio');
  });

  it('l app non dichiara piu «affidabile» nessuno', () => {
    expect(discovery).not.toContain('Persona affidabile');
  });

  it('i tre ordinamenti dicono cosa fanno, e «Per te» non c e piu', () => {
    const barra = senzaCommenti(leggi('components/discovery-filter-bar.tsx'));
    expect(barra).not.toContain('Per te');
    expect(barra).toContain('Chi finisce prima');
  });

  it('le preferenze salvate sui telefoni non riportano il vecchio criterio', () => {
    // Il merge con i default riporterebbe "smart", che cadrebbe nel ramo di
    // riserva senza che nessuno se ne accorga.
    expect(leggi('lib/discovery-context.tsx')).toContain('btb.discovery.filters.v3');
  });
});

describe('il repository è pubblico, e si comporta di conseguenza', () => {
  it('nessun file vietato è tracciato', () => {
    // Da qui in avanti ogni commit è irreversibile: quello che finisce nella
    // storia ci resta anche dopo la cancellazione.
    const { execSync } = require('child_process') as typeof import('child_process');
    const tracciati = execSync('git ls-files', { cwd: path.join(__dirname, '..', '..') }).toString();
    for (const vietato of [/^\.env$/m, /adminsdk.*\.json$/m, /\.apk$/m, /_expo\/static/m]) {
      expect(tracciati).not.toMatch(vietato);
    }
  });

  it('la diagnostica non parte senza che qualcuno la legga', () => {
    // Il DSN era in chiaro e mandava i crash a un progetto Sentry a cui
    // nessuno del team ha accesso, mentre i termini non lo nominavano.
    const layout = senzaCommentiFile(leggi('app/_layout.tsx'));
    expect(layout).not.toMatch(/ingest\.[a-z]*\.?sentry\.io/);
    expect(layout).toContain('EXPO_PUBLIC_SENTRY_DSN');
  });

  it('il link di download segue sempre l ultima release', () => {
    // Puntava a un tag fisso perché il repository era privato e gli allegati
    // delle release private non si scaricano senza account.
    const branding = leggi('constants/branding.ts');
    expect(branding).toContain('/releases/latest/download/');
    expect(branding).not.toMatch(/releases\/download\/v/);
  });

  it('la porta d ingresso non è più il template di un altra azienda', () => {
    const readme = leggi('README.md');
    expect(readme).not.toContain('Welcome to your Expo app');
    expect(readme).toContain('PORTA. BEVI. RIPETI.');
  });

  it('esistono i file che rendono l apertura leggibile', () => {
    expect(fs.existsSync(path.join(RADICE, 'SECURITY.md'))).toBe(true);
    expect(fs.existsSync(path.join(RADICE, 'Brand/CORREZIONI.md'))).toBe(true);
  });
});

describe('la versione si legge dentro l app', () => {
  it('esiste un numero che le persone possono citare', () => {
    // Prima non compariva in nessun punto: chi segnalava un difetto non sapeva
    // cosa stesse usando, e ogni feedback arrivava etichettato «V2.1».
    expect(leggi('constants/versione.ts')).toMatch(/VERSIONE = '\d+\.\d+\.\d+/);
    expect(leggi('app/settings.tsx')).toContain('VERSIONE_ESTESA');
  });

  it('app.json resta fermo: è la chiave del canale, non una versione', () => {
    // Cambiarla rende invisibili tutti gli aggiornamenti successivi ai
    // telefoni già installati, in silenzio.
    const appJson = JSON.parse(leggi('app.json')) as { expo: { version: string } };
    expect(appJson.expo.version).toBe('1.1.0');
  });
});
