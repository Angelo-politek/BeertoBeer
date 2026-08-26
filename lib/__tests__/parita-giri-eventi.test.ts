import fs from 'fs';
import path from 'path';

import { GIRO } from '@/constants/testi';
import { mancanzaPosizione } from '@/lib/posizione';

/**
 * GIRI ED EVENTI DEVONO COMPORTARSI ALLO STESSO MODO.
 *
 * Un giro si posizionava con GPS, ricerca indirizzo o puntando sulla mappa.
 * Un evento aveva solo un campo di testo libero: chi lo leggeva non sapeva
 * dove fosse, non compariva sulla mappa e non aveva una distanza.
 *
 * La strada corta sarebbe stata copiare il codice da una schermata all'altra.
 * Fra un mese le due si sarebbero comportate in modo diverso, perché una
 * correzione sarebbe finita in una sola delle due — è esattamente così che in
 * questo progetto sono nati i bug più fastidiosi (lo stesso confronto
 * sbagliato trovato tre volte in tre file, un elenco di stati rimasto
 * indietro che ha bloccato la chat).
 *
 * Questo test tiene le due schermate sullo stesso componente.
 */

const RADICE = path.join(__dirname, '..', '..');
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf8');

/** Le due schermate che chiedono «dove». */
const SCHERMATE_CON_POSIZIONE = ['app/create-request.tsx', 'app/event/new.tsx'];

describe('la regola «senza coordinate non si pubblica»', () => {
  const punto = { lat: 45.07, lng: 7.69 };

  it('senza indirizzo chiede l’indirizzo', () => {
    expect(mancanzaPosizione({ indirizzo: '', coords: null })).toBe("l'indirizzo");
    expect(mancanzaPosizione({ indirizzo: '   ', coords: null })).toBe("l'indirizzo");
  });

  it('usa le parole della schermata quando gliele si passa', () => {
    expect(mancanzaPosizione({ indirizzo: '', coords: null }, "l'indirizzo del ritrovo")).toBe(
      "l'indirizzo del ritrovo",
    );
  });

  it('un indirizzo scritto ma mai confermato NON è una posizione', () => {
    // È il caso che manda una persona a girare per niente: c'è del testo, ma
    // nessuno ha mai verificato che corrisponda a un punto vero.
    // ⚠️ Si confronta con il TESTO, non con una stringa copiata qui.
    // Questo test verifica una REGOLA — senza coordinate non si pubblica — e
    // una regola non deve cadere perché qualcuno ha corretto un apostrofo.
    // (È successo davvero: la migrazione C6 ha sostituito l'apostrofo ASCII
    // con quello tipografico, e questa riga si è rotta senza che la logica
    // fosse cambiata di una virgola.)
    expect(mancanzaPosizione({ indirizzo: 'Via Roma 1', coords: null })).toBe(
      GIRO.lancia.mancaConfermaMappa,
    );
  });

  it('con indirizzo e punto non manca niente', () => {
    expect(mancanzaPosizione({ indirizzo: 'Via Roma 1', coords: punto })).toBeNull();
  });
});

describe('parità fra giri ed eventi', () => {
  it.each(SCHERMATE_CON_POSIZIONE)('%s usa il campo posizione condiviso', (file) => {
    expect(leggi(file)).toContain("from '@/components/location-field'");
  });

  it.each(SCHERMATE_CON_POSIZIONE)('%s non si rifà una copia propria della logica', (file) => {
    const contenuto = leggi(file);
    // Se una schermata torna a chiamare da sola il GPS, la ricerca indirizzo o
    // la mappa di scelta, le due strade hanno ricominciato a divergere.
    expect(contenuto).not.toContain('getCurrentCoords');
    expect(contenuto).not.toContain('reverseGeocode');
    expect(contenuto).not.toContain('LocationPickerMap');
  });

  it('entrambe pretendono le coordinate prima di pubblicare', () => {
    for (const file of SCHERMATE_CON_POSIZIONE) {
      expect(leggi(file)).toContain('mancanzaPosizione');
    }
  });

  it('gli eventi arrivano al database con le coordinate', () => {
    const nuovo = leggi('app/event/new.tsx');
    expect(nuovo).toContain('lat: posizione.coords');
    expect(nuovo).toContain('lng: posizione.coords');
  });

  it('la mappa sa disegnare anche gli incontri', () => {
    const mappa = leggi('components/feed-map.tsx');
    expect(mappa).toContain("kind: 'event'");
    // Il segnaposto c'è solo se la scheda mappa gli passa davvero gli eventi.
    expect(leggi('app/(tabs)/map.tsx')).toContain('events={events}');
  });
});
