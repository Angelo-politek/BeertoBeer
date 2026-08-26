import fs from 'fs';
import path from 'path';

import { GLOSSARY } from '@/constants/branding';
import { INGRESSO, PAROLE, VOCE } from '@/constants/testi';

/**
 * UN NOME SOLO PER OGNI COSA.
 *
 * Perché questo test esiste: la schermata iniziale diceva «GIRI IN ZONA»,
 * «GIRI APERTI», «GIRO ATTIVO», ma il pulsante per crearne uno diceva «Chiedi
 * una birra» e portava a una schermata intitolata «Nuova richiesta». Chi
 * pensava "voglio lanciare un giro" cercava quella parola fra le azioni e non
 * la trovava. È stata la segnalazione più grave della beta, e veniva da chi il
 * progetto lo conosce a memoria.
 *
 * Il glossario esisteva già allora: era solo scollegato. Questo test lo tiene
 * collegato.
 */

const RADICE = path.join(__dirname, '..', '..');

function leggi(relativo: string): string {
  return fs.readFileSync(path.join(RADICE, relativo), 'utf8');
}

/** Schermate dove il nome dell'azione principale deve essere quello ufficiale. */
const SCHERMATE_PRINCIPALI = ['app/(tabs)/index.tsx', 'app/create-request.tsx', 'app/my-orders.tsx'];

/** Vecchie diciture: erano sinonimi scollegati della stessa identica cosa. */
const DICITURE_ABBANDONATE = ['Chiedi una birra', 'Nuova richiesta', 'Nuova consegna'];

describe('glossario', () => {
  it('definisce un nome e un verbo per il giro', () => {
    expect(GLOSSARY.delivery).toBe('giro');
    expect(GLOSSARY.createDeliveryAction).toMatch(/giro/i);
    expect(GLOSSARY.createDeliveryTitle).toMatch(/giro/i);
  });

  it("il verbo dell'azione e il titolo della schermata parlano della stessa cosa", () => {
    // Se il pulsante dice una parola e la schermata che apre ne dice un'altra,
    // chi lo preme non è sicuro di essere finito nel posto giusto.
    const parolaChiave = GLOSSARY.delivery.toLowerCase();
    expect(GLOSSARY.createDeliveryAction.toLowerCase()).toContain(parolaChiave);
    expect(GLOSSARY.createDeliveryTitle.toLowerCase()).toContain(parolaChiave);
  });

  it.each(SCHERMATE_PRINCIPALI)('%s non contiene diciture abbandonate', (file) => {
    const contenuto = leggi(file);
    for (const vecchia of DICITURE_ABBANDONATE) {
      expect(contenuto).not.toContain(`"${vecchia}"`);
      expect(contenuto).not.toContain(`'${vecchia}'`);
    }
  });

  it('la schermata iniziale prende le parole dal glossario, non a mano', () => {
    const feed = leggi('app/(tabs)/index.tsx');
    expect(feed).toContain("from '@/constants/branding'");
    expect(feed).toContain('GLOSSARY.createDeliveryAction');
  });
});

/* ------------------------------------------------------------------------ */
/*  #2 — IL CONTATORE DELLA MIGRAZIONE C6                                    */
/* ------------------------------------------------------------------------ */

/**
 * IL CONTATORE DI C6, E L'UNICO RENDICONTO CHE SERVE.
 *
 * Le ~90 stringhe del database sono state riscritte in una migrazione sola.
 * Quelle dell'app no: l'app parla ancora in quattro modi, e ogni schermata
 * nuova scritta prima che questo finisca va poi riscritta due volte. È l'unica
 * voce del piano il cui costo cresce ogni giorno che passa.
 *
 * COME FUNZIONA. Ogni file sorvegliato che contiene testo italiano fuori da
 * `constants/testi/` è un colpevole. La lista `IN_DEROGA` parte con dentro
 * TUTTI, e si svuota una riga alla volta. Quando è vuota, C6 è finito.
 *
 * ⚠️ LE DUE REGOLE PER CUI QUESTO TEST NON È UNA BUROCRAZIA:
 *
 * 1. Una deroga che non serve più FA FALLIRE il test. Senza, la lista
 *    resterebbe piena per sempre e il contatore direbbe una cifra falsa.
 *
 * 2. IL PERIMETRO NON È SOLO `app/`. Il piano diceva «le schermate», ma con
 *    una lista che guarda solo le schermate, spostare una frase da
 *    `app/x.tsx` dentro `components/y.tsx` svuota una riga della lista senza
 *    aver riscritto niente — e il contatore segnerebbe un avanzamento che non
 *    è avvenuto, cioè esattamente il fallimento che esiste per impedire.
 *    Non è teorico: `lib/auth-errors.ts` teneva diciotto frasi lette a
 *    schermo, e `components/location-field.tsx` ne teneva venti, di cui una
 *    («Non sono riuscito a ricavare la via») violava la regola sull'«io» che
 *    il piano cita usando quel medesimo esempio.
 */

/** Le cartelle sorvegliate per intero: un file nuovo entra da solo. */
const CARTELLE_SORVEGLIATE = ['app', 'components'];

/**
 * I file fuori da quelle cartelle che contengono comunque testo letto a
 * schermo. Elenco esplicito: `lib/` e `constants/` sono in gran parte logica,
 * e sorvegliarli interi darebbe falsi allarmi su nomi di città e chiavi.
 */
const FILE_SORVEGLIATI_FUORI = [
  'lib/age.ts',
  'lib/auth-errors.ts',
  'lib/avatar-upload.ts',
  'lib/discovery.ts',
  'lib/errori.ts',
  'lib/format.ts',
  'lib/load.ts',
  'lib/locandina-upload.ts',
  'lib/orders.ts',
  'lib/posizione.ts',
  'lib/push-notifications.ts',
  'lib/supabase.ts',
  'lib/uscite.ts',
  'constants/compliments.ts',
  'constants/novita.ts',
];

/*
 * ⚠️ `constants/branding.ts` NON è sorvegliato, e non è una dimenticanza.
 *
 * Contiene il glossario e le frasi del marchio — «Lancia un giro», «chi
 * porta», «SOLO BEERCOIN, MAI SOLDI» — che sono parole ufficiali, non copy di
 * una schermata: è la loro CASA, esattamente come `constants/testi/`, e
 * `testi/parole.ts` non fa che rimandarci. Metterlo in lista significherebbe
 * una deroga che non può mai essere tolta, e una lista che non può arrivare a
 * zero è una lista che nessuno finisce di svuotare.
 *
 * Il confine è questo: **identità** (che si cambia con un commit in
 * `Brand/CORREZIONI.md`) sta in `branding.ts`; **copy** (che si riscrive
 * quando serve) sta in `testi/`. Le slide dell'onboarding erano dalla parte
 * sbagliata del confine, e sono state spostate.
 */

/**
 * LA LISTA CHE SI SVUOTA.
 *
 * Ogni riga è un file che parla ancora italiano per conto suo. Si toglie una
 * riga quando le sue stringhe sono state RISCRITTE e spostate in `testi/` —
 * mai spostate e basta: una frase brutta dentro un dizionario è una frase
 * brutta congelata per due anni.
 *
 * Fatti finora:
 *   S1 · LA SOGLIA, COMPLETA — `app/(auth)/` per intero, `lib/auth-errors.ts`,
 *        `app/onboarding.tsx` e `app/invite.tsx`.
 *
 * Onboarding e invito erano bloccati da due decisioni del fondatore, prese il
 * 26/08/2026 — «vibe» resta (il difetto era nei filtri, ed è chiuso da
 * `filtri-non-si-perdono.test.ts`) e l'invito non ha prezzo — e sono entrati
 * subito dopo.
 *
 *   S2 · IL GIRO, COMPLETA — il vocabolario condiviso (gli stati, i motivi per
 *        cui un giro è fermo, le etichette della prossima azione, che stavano
 *        sparsi fra `lib/orders.ts` e `lib/discovery.ts`), `my-orders`,
 *        `review`, `create-request`, `request/[id]` (875 righe e 84 frasi, la
 *        più grossa dell'app) e le tre chat.
 *
 *   S3 · LE PERSONE E IL SISTEMA, in corso.
 *        ⚠️ `app/connections.tsx` non è stata riscritta: è stata CANCELLATA.
 *        Era orfana — nessuna rotta ci portava — e `app/amici.tsx` fa le
 *        stesse cose usando la stessa API più altre due. Tradurre codice morto
 *        lo fotografa invece di curarlo, e in `app/` un file orfano è comunque
 *        una rotta che un deep link può aprire sul vuoto.
 */
const IN_DEROGA = [
  'app/(tabs)/community.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/map.tsx',
  'app/_layout.tsx',
  'app/admin/giri.tsx',
  'app/admin/incontri.tsx',
  'app/admin/index.tsx',
  'app/admin/inviti.tsx',
  'app/admin/reports.tsx',
  'app/admin/safety-map.tsx',
  'app/admin/shops.tsx',
  'app/admin/statistiche.tsx',
  'app/admin/users.tsx',
  'app/admin/utente/[id].tsx',
  'app/beercoin.tsx',
  'app/event/[id].tsx',
  'app/event/modifica/[id].tsx',
  'app/event/new.tsx',
  'app/feedback.tsx',
  'app/notification-settings.tsx',
  'app/notifications.tsx',
  'app/novita.tsx',
  'app/segnalazione/[id].tsx',
  'app/settings.tsx',
  'app/terms.tsx',
  'components/add-shop-modal.tsx',
  'components/birthdate-field.tsx',
  'components/city-picker.tsx',
  'components/discovery-filter-bar.tsx',
  'components/feed-map.tsx',
  'components/foglio-uscita.tsx',
  'components/grafico-barre.tsx',
  'components/location-field.tsx',
  'components/location-picker-map.tsx',
  'components/novita-banner.tsx',
  'components/profile-showcase.tsx',
  'components/provvedimento-modal.tsx',
  'components/report-modal.tsx',
  'components/request-card.tsx',
  'components/tessera-invito.tsx',
  'constants/compliments.ts',
  'constants/novita.ts',
  'lib/age.ts',
  'lib/avatar-upload.ts',
  'lib/errori.ts',
  'lib/format.ts',
  'lib/load.ts',
  'lib/locandina-upload.ts',
  'lib/posizione.ts',
  'lib/push-notifications.ts',
  'lib/supabase.ts',
  'lib/uscite.ts',
];

/**
 * Toglie i commenti PRIMA di cercare.
 *
 * Senza, questo test fallirebbe su se stesso: i commenti di questo repository
 * citano di proposito le frasi che sono state tolte («prima diceva “Chiedi una
 * birra”…»), perché spiegare l'errore è metà del valore del file. Se
 * commentare diventasse vietato quanto sbagliare, si smetterebbe di
 * commentare.
 */
function senzaCommenti(sorgente: string): string {
  return sorgente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Toglie gli AGHI DI RICERCA: una stringa passata a `includes`, `startsWith`,
 * `endsWith` o confrontata con `===` non è una frase che qualcuno legge, è un
 * criterio di confronto.
 *
 * Serve davvero: `lib/auth-errors.ts` cerca `'confirmation email'` dentro il
 * messaggio INGLESE del server, e senza questo passaggio il test lo scambiava
 * per copy italiano — perché «email» è una parola che le due lingue
 * condividono. Un test-guardia che grida su codice corretto viene aggirato
 * entro la settimana, ed è il modo in cui i test-guardia muoiono.
 */
function senzaAghi(sorgente: string): string {
  return sorgente
    .replace(/\.(?:includes|startsWith|endsWith|indexOf|search)\(\s*(['"`]).*?\1\s*\)/g, '.confronto()')
    .replace(/[=!]==\s*(['"`]).*?\1/g, '=== chiave');
}

/**
 * Parole che esistono praticamente solo in italiano e quasi mai in codice.
 * Servono a distinguere una FRASE da una chiave: `'accettato'` è uno stato,
 * `'Il giro è stato accettato'` è una cosa che una persona legge.
 */
const PAROLE_ITALIANE =
  /(?:^|[^a-zA-Z])(?:il|lo|la|le|gli|un|una|uno|del|della|delle|dei|degli|dal|dalla|nel|nella|sul|sulla|al|alla|ai|agli|che|chi|cosa|come|quando|dove|perch[eé]|non|pi[uù]|gi[aà]|solo|anche|ancora|sempre|mai|puoi|pu[oò]|devi|deve|fare|fatto|hai|ha|sei|[eè]|sono|siamo|questo|questa|quello|quella|tuo|tua|tuoi|mio|mia|con|per|tra|fra|senza|dopo|prima|poi|adesso|ora|qui|qua|riprova|errore|errori|niente|nessuno|nessuna|qualcuno|qualcosa|tutti|tutte|tutto|birra|birre|giro|giri|citt[aà]|zona|amico|amici|persona|persone|invito|inviti|codice|profilo|messaggio|messaggi|notifica|notifiche|segnala|segnalazione|conferma|annulla|chiudi|apri|scegli|scrivi|cerca|salva|indietro|avanti|accedi|entra|esci|registrati|password|email)(?:[^a-zA-Z]|$)/i;

const ACCENTO = /[àèéìòùÀÈÉÌÒÙ]/;

/** Stringhe tecniche: colori, path, mime, identificatori, numeri. */
function tecnica(valore: string): boolean {
  const v = valore.trim();
  if (v.length < 3) return true;
  if (/^[#@./\\]/.test(v)) return true;
  if (/^https?:/.test(v)) return true;
  if (/^\w+\/[\w./-]+$/.test(v)) return true;
  if (/^[a-z0-9_-]+$/i.test(v)) return true;
  if (/^\d/.test(v)) return true;
  // Senza spazi e senza accenti è quasi sempre una chiave, non una frase.
  return !v.includes(' ') && !ACCENTO.test(v);
}

const LETTERALE = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const TESTO_JSX = />\s*([A-ZÀÈÉÌÒÙa-zà-ù][^<>{}\n]{3,})\s*</g;

/** Le frasi italiane che questo file dice per conto suo. */
function frasiItaliane(relativo: string): string[] {
  const sorgente = senzaAghi(senzaCommenti(fs.readFileSync(path.join(RADICE, relativo), 'utf8')));
  const trovate: string[] = [];

  for (const m of sorgente.matchAll(LETTERALE)) {
    // In un template la COPY sono le parti letterali: `${...}` è codice.
    // Senza questo passaggio, `${forma}${zona ? ` a ${zona}` : ''}` risultava
    // italiano perché contiene la parola «zona», mentre non contiene nessuna
    // frase — e un test che grida su codice corretto viene aggirato in una
    // settimana.
    const v = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
    if (tecnica(v)) continue;
    if (!ACCENTO.test(v) && !PAROLE_ITALIANE.test(v)) continue;
    trovate.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  for (const m of sorgente.matchAll(TESTO_JSX)) {
    const v = m[1].trim();
    if (tecnica(v)) continue;
    if (!ACCENTO.test(v) && !PAROLE_ITALIANE.test(v)) continue;
    trovate.push(v);
  }
  return trovate;
}

/** Tutti i file sorvegliati, in ordine stabile. */
function fileSorvegliati(): string[] {
  const trovati: string[] = [];
  const scendi = (dir: string) => {
    for (const voce of fs.readdirSync(path.join(RADICE, dir), { withFileTypes: true })) {
      const rel = `${dir}/${voce.name}`;
      if (voce.isDirectory()) scendi(rel);
      else if (/\.tsx?$/.test(voce.name)) trovati.push(rel);
    }
  };
  for (const cartella of CARTELLE_SORVEGLIATE) scendi(cartella);
  return [...trovati, ...FILE_SORVEGLIATI_FUORI].sort();
}

describe('C6 · le parole stanno in constants/testi', () => {
  const sorvegliati = fileSorvegliati();

  it('il perimetro non si è svuotato per sbaglio', () => {
    // Se un giorno il conteggio crolla, il test è rotto — non il codice pulito.
    expect(sorvegliati.length).toBeGreaterThan(60);
  });

  it('nessun file fuori deroga parla italiano per conto suo', () => {
    const colpevoli = sorvegliati
      .filter((f) => !IN_DEROGA.includes(f))
      .filter((f) => frasiItaliane(f).length > 0)
      .map((f) => `${f} — ${frasiItaliane(f)[0]}`);
    expect(colpevoli).toEqual([]);
  });

  it('nessuna deroga è rimasta senza motivo', () => {
    // Una deroga che non serve più va TOLTA: è così che la lista si svuota, ed
    // è l'unico modo perché il conteggio qui sotto voglia dire qualcosa.
    const inutili = IN_DEROGA.filter((f) => frasiItaliane(f).length === 0);
    expect(inutili).toEqual([]);
  });

  it('ogni file in deroga esiste ancora', () => {
    const fantasmi = IN_DEROGA.filter((f) => !fs.existsSync(path.join(RADICE, f)));
    expect(fantasmi).toEqual([]);
  });

  it('quanto manca', () => {
    const rimasti = IN_DEROGA.length;
    const fatti = sorvegliati.length - rimasti;
    // Non è un'asserzione sul valore: è la riga che si legge nel rendiconto.
    // eslint-disable-next-line no-console
    console.log(`C6 · ${fatti} file su ${sorvegliati.length} parlano dai testi. Mancano ${rimasti}.`);
    expect(rimasti).toBeLessThanOrEqual(IN_DEROGA.length);
  });
});

describe('C6 · le regole di forma dei testi', () => {
  it('il maiuscolo non si scrive nel sorgente dei testi', () => {
    // `ThemedText` type="title"/"label"/"display" e `Button` lo applicano già.
    // Una stringa scritta MAIUSCOLA non arriva maiuscola dove non c'è foglio
    // di stile — titolo di un Alert, di una push, di Share.share — e TalkBack
    // la legge lettera per lettera.
    const urlate: string[] = [];
    for (const area of ['parole', 'voce', 'ingresso']) {
      const sorgente = senzaCommenti(leggi(`constants/testi/${area}.ts`));
      for (const m of sorgente.matchAll(LETTERALE)) {
        const v = m[1] ?? m[2] ?? m[3] ?? '';
        const lettere = v.replace(/[^a-zA-ZÀ-ù]/g, '');
        if (lettere.length >= 4 && lettere === lettere.toUpperCase()) urlate.push(`${area}: ${v}`);
      }
    }
    expect(urlate).toEqual([]);
  });

  it('nel copy non ci sono punti esclamativi', () => {
    // Nessuno degli esempi ufficiali del marchio ne ha uno: l'unico strumento
    // di volume è il maiuscolo in Bebas, che lo mette il foglio di stile.
    const urlate: string[] = [];
    for (const area of ['parole', 'voce', 'ingresso']) {
      const sorgente = senzaCommenti(leggi(`constants/testi/${area}.ts`));
      for (const m of sorgente.matchAll(LETTERALE)) {
        const v = m[1] ?? m[2] ?? m[3] ?? '';
        if (v.includes('!')) urlate.push(`${area}: ${v}`);
      }
    }
    expect(urlate).toEqual([]);
  });

  it('i testi non parlano né in prima persona né al plurale maiestatis', () => {
    // «Non siamo riusciti ad aggiornare la password» faceva apparire una
    // società che qui non esiste. «Sto confermando il tuo account» faceva
    // dell'app un personaggio, cioè la mascotte da startup che il marchio
    // vieta. Erano entrambe vive sulla soglia.
    const vietate =
      /(?:^|[^a-zA-Z])(?:siamo|abbiamo|nostro|nostra|nostri|nostre|possiamo|riusciamo|sto|posso|riesco|non riesco)(?:[^a-zA-Z]|$)/i;
    const colpevoli: string[] = [];
    for (const area of ['parole', 'voce', 'ingresso']) {
      const sorgente = senzaCommenti(leggi(`constants/testi/${area}.ts`));
      for (const m of sorgente.matchAll(LETTERALE)) {
        const v = m[1] ?? m[2] ?? m[3] ?? '';
        if (vietate.test(v)) colpevoli.push(`${area}: ${v}`);
      }
    }
    expect(colpevoli).toEqual([]);
  });

  it('i testi non contengono emoji', () => {
    // La regola ICONE del marchio: «outline, bianco, 2-3px, disegnate a mano,
    // mai glossy, 3D, gradient». Un'emoji di sistema è un glifo glossy
    // multicolore disegnato da qualcun altro, spedito dentro il nostro
    // marchio. I segni tipografici monocromatici (→ · ✓) non lo sono: prendono
    // il colore del testo.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
    const colpevoli: string[] = [];
    for (const area of ['parole', 'voce', 'ingresso']) {
      const sorgente = senzaCommenti(leggi(`constants/testi/${area}.ts`));
      for (const m of sorgente.matchAll(LETTERALE)) {
        const v = m[1] ?? m[2] ?? m[3] ?? '';
        if (emoji.test(v)) colpevoli.push(`${area}: ${v}`);
      }
    }
    expect(colpevoli).toEqual([]);
  });

  it('i numeri arrivano come parametro, non scritti dentro la frase', () => {
    // «+5 BeerCoin» contro i 3 che arrivavano davvero: un numero copiato in
    // una frase è un numero che il giorno dopo mente. Le voci che parlano di
    // una quantità sono funzioni, e il numero lo passa chi lo conosce.
    expect(typeof INGRESSO.registrazione.eta).toBe('function');
    expect(typeof INGRESSO.registrazione.passwordCorta).toBe('function');
    expect(typeof INGRESSO.nuovaPassword.passwordCorta).toBe('function');
    expect(typeof INGRESSO.errori.passwordDebole).toBe('function');
    expect(INGRESSO.registrazione.eta(18)).toContain('18');
    expect(INGRESSO.registrazione.passwordCorta(6)).toContain('6');
  });

  it('i testi non riscrivono le parole del glossario a mano', () => {
    // `PAROLE` rimanda a `constants/branding.ts` e non ridefinisce niente: il
    // giorno in cui «giro» cambia nome, deve cambiare in un posto solo.
    expect(PAROLE.giro).toBe(GLOSSARY.delivery);
    expect(PAROLE.chiPorta).toBe(GLOSSARY.roleCarrier);
    expect(PAROLE.chiChiede).toBe(GLOSSARY.roleAsker);
  });

  it('le parole vietate dal glossario non rientrano dalla finestra', () => {
    /**
     * ⚠️ Questo è il controllo che tiene in piedi il glossario adesso che i
     * testi stanno in un posto solo: prima le parole vietate erano sparse in
     * cinquanta schermate e nessuno poteva cercarle tutte.
     *
     * Ne sono state tolte cinque solo da `request/[id].tsx` e
     * `create-request.tsx`: «driver», «host», «crediti», «richiesta» come
     * oggetto, «consegna» come oggetto. Erano lì da sempre, ognuna sembrava
     * innocua, e insieme facevano parlare l'app in quattro modi.
     */
    const vietate: [RegExp, string][] = [
      [/\bdriver\b/i, 'driver'],
      [/\brider\b/i, 'rider'],
      [/\bfattorin/i, 'fattorino'],
      [/(?:^|[^a-z])host(?:[^a-z]|$)/i, 'host'],
      [/\bcredit[oi]\b/i, 'crediti'],
      [/\bkarma\b/i, 'karma'],
      [/\breferral\b/i, 'referral'],
      [/\bdelivery\b/i, 'delivery'],
    ];

    /**
     * ⚠️ «DELIVERY» DETTO PER NEGARLO NON È UN'INFRAZIONE, È IL MARCHIO.
     *
     * La prima slide dell'onboarding si intitola «Non è un delivery», e la
     * VISION della bible comincia esattamente così. Il glossario vieta di
     * CHIAMARE un giro «delivery»: non vieta di nominare la cosa che il
     * progetto dichiara di non essere. Un test che non distingue le due cose
     * costringerebbe a cancellare la frase più identitaria dell'app.
     */
    const negazioni = /non\s+(?:è|e')\s+un\s+delivery/i;

    /**
     * LE ECCEZIONI, CON LA DATA E CHI LE CHIUDE.
     *
     * Una parola vietata che resta a schermo va DICHIARATA, non nascosta: una
     * lista datata la rende contabile, e chi arriva dopo sa da dove viene.
     *
     * · «Karma» (26/08/2026) — è l'etichetta del terzo numero sul profilo
     *   altrui, e vale `portati − ricevuti`. Rinominarla e basta non la
     *   sistemerebbe: il difetto non è la parola, è che **un numero negativo
     *   accanto a un nome è un marchio** — chi ha ricevuto 4 e portato 1 legge
     *   «−3» sul suo profilo. La chiude **E2**, che la mostra come rapporto e
     *   la sposta al primo posto. Toglierla da sola lascerebbe a schermo un
     *   numero senza nome, che è peggio.
     */
    const eccezioni = new Set(['Karma']);

    const colpevoli: string[] = [];
    for (const area of ['parole', 'voce', 'ingresso', 'giro', 'persone']) {
      const sorgente = senzaCommenti(leggi(`constants/testi/${area}.ts`));
      for (const m of sorgente.matchAll(LETTERALE)) {
        const v = m[1] ?? m[2] ?? m[3] ?? '';
        if (negazioni.test(v)) continue;
        if (eccezioni.has(v)) continue;
        for (const [espressione, nome] of vietate) {
          if (espressione.test(v)) colpevoli.push(`${area}: «${nome}» in ${v.slice(0, 50)}`);
        }
      }
    }
    expect(colpevoli).toEqual([]);

    // ⚠️ «Per te» NON si controlla qui: è l'etichetta di un ORDINAMENTO, e in
    // una frase qualsiasi «per te» è italiano normale («ha speso il suo unico
    // posto per te»). Il posto giusto è il test sui criteri di ordinamento —
    // `niente-ranking` nel piano — dove si guarda il chip, non il copy.
  });

  it('il nome di una persona non si scrive mai in maiuscolo', () => {
    // ⚠️ `app/review.tsx` passava il nome di chi hai appena incontrato a
    // `type="title"`, e `title` applica textTransform: uppercase. La schermata
    // in cui racconti com'è andato uno scambio con una persona ti urlava
    // addosso il suo nome. Il maiuscolo del marchio è per le affermazioni
    // dell'app; un nome è di chi ce l'ha.
    const stile = senzaCommenti(leggi('components/themed-text.tsx'));
    const blocco = stile.slice(stile.indexOf('nome: {'), stile.indexOf('subtitle: {'));
    expect(blocco).toContain('Fonts.display');
    expect(blocco).not.toContain('textTransform');

    const recensione = senzaCommenti(leggi('app/review.tsx'));
    expect(recensione).toContain('type="nome"');
    expect(recensione).not.toMatch(/type="title">\{context\.target\.nome\}/);
  });

  it('«login» non è tornato: la porta si chiama accesso', () => {
    // Era in tre schermate come «Torna al login» / «Vai al login», mentre la
    // schermata a cui portava si intitola «Accedi». Due nomi per la stessa
    // porta è il difetto che questo file esiste per impedire.
    expect(VOCE.azione.tornaAllAccesso.toLowerCase()).not.toContain('login');
    for (const f of ['app/(auth)/login.tsx', 'app/(auth)/reset-password.tsx', 'app/(auth)/forgot-password.tsx']) {
      const sorgente = senzaCommenti(leggi(f));
      expect(sorgente).not.toMatch(/al login|Vai al login/i);
    }
  });
});
