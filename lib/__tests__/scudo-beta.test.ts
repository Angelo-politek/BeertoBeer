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
