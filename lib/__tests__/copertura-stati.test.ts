import fs from 'fs';
import path from 'path';

import { nextOrderAction } from '@/lib/discovery';
import { STATO_LABEL } from '@/lib/orders';
import type { BeerRequest, OrderStatus } from '@/types';

/**
 * COPERTURA DEGLI STATI DI UN GIRO.
 *
 * Perché questo test esiste: quando è stato aggiunto lo stato `arrivato` (v2),
 * l'elenco degli stati in cui la chat permette di scrivere non è stato
 * aggiornato. Risultato: la chat si bloccava ESATTAMENTE quando chi porta era
 * sotto casa e voleva chiedere il citofono. Nessuno se n'è accorto per
 * settimane, perché niente lo verificava.
 *
 * Da qui in poi, aggiungere uno stato senza gestirlo ovunque fa fallire i test
 * prima che se ne accorga una persona.
 */

const TUTTI_GLI_STATI: OrderStatus[] = [
  'richiesto',
  'accettato',
  'in_consegna',
  'arrivato',
  'consegnato',
  'confermato',
  'annullato',
];

function giroFinto(stato: OrderStatus): BeerRequest {
  return {
    id: 'giro-1',
    host: { id: 'host-1', nome: 'Host', eta: 30, bio: '', ratingMedio: 5, scambiCompletati: 0, creditiSaldo: 0 },
    driverId: 'driver-1',
    birre: [],
    indirizzo: 'Via di prova 1',
    stato,
    vibeMode: false,
    creditiOfferti: 3,
    hostConfermato: false,
    driverConfermato: false,
    createdAt: new Date().toISOString(),
  };
}

describe('ogni stato di un giro è gestito ovunque serva', () => {
  it.each(TUTTI_GLI_STATI)('«%s» ha un\'etichetta leggibile', (stato) => {
    expect(STATO_LABEL[stato]).toBeTruthy();
  });

  it.each(TUTTI_GLI_STATI)('«%s» propone un\'azione sensata a chi chiede e a chi porta', (stato) => {
    for (const io of ['host-1', 'driver-1']) {
      const azione = nextOrderAction(giroFinto(stato), io);
      expect(azione.label).toBeTruthy();
      expect(azione.key).toBeTruthy();
    }
  });

  it('la chat lato database consente di scrivere in tutti gli stati attivi', () => {
    // Legge la regola vera dalle migrazioni invece di fidarsi di una copia:
    // è il punto in cui il disallineamento si era creato.
    const dir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
    const testo = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
      .join('\n');

    // Si isola SOLO il corpo dell'ultima definizione della regola, fino al
    // punto e virgola. Cercare la parola in tutto il file farebbe passare il
    // test per il motivo sbagliato: 'arrivato' compare anche altrove (per
    // esempio nel vincolo degli stati), e un test che passa a caso è peggio di
    // nessun test.
    const inizio = testo.lastIndexOf('create policy "messages_insert_participants"');
    expect(inizio).toBeGreaterThan(-1);
    const corpo = testo.slice(inizio, testo.indexOf(';', inizio));

    // Stati in cui DEVE essere possibile scriversi: da quando esiste una
    // controparte fino a scambio chiuso. Fuori restano 'richiesto' (non c'è
    // ancora nessuno con cui parlare) e 'annullato'.
    for (const stato of ['accettato', 'in_consegna', 'arrivato', 'consegnato', 'confermato']) {
      expect(corpo).toContain(`'${stato}'`);
    }
  });
});
