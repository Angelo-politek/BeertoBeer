import fs from 'fs';
import path from 'path';

import { Durations, Springs, Stagger } from '@/constants/theme';

/**
 * IL MOVIMENTO SI CAMBIA IN UN POSTO SOLO.
 *
 * Segnalazione del collaudo: «le animazioni fanno davvero schifo, alcune non
 * sono per niente fluide e sembrano a rallentatore».
 *
 * La causa era misurabile, non estetica: la stessa riga
 * `.springify().damping(20).stiffness(180)` era scritta a mano in dieci file,
 * e la cascata delle liste arrivava a 8 × 55 ms = 440 ms prima che comparisse
 * l'ultimo elemento. Nessuno poteva sistemare il movimento dell'app senza
 * trovarli tutti — ed è la stessa classe di errore del glossario e della
 * formula dei crediti scritta due volte.
 *
 * Questo test impedisce che ricominci.
 */

const RADICE = path.join(__dirname, '..', '..');

/** Tutti i .tsx del progetto, esclusi i moduli installati. */
function schermateEComponenti(dir = RADICE, trovati: string[] = []): string[] {
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    if (voce.name === 'node_modules' || voce.name === 'dist' || voce.name.startsWith('.')) continue;
    const completo = path.join(dir, voce.name);
    if (voce.isDirectory()) schermateEComponenti(completo, trovati);
    else if (voce.name.endsWith('.tsx')) trovati.push(completo);
  }
  return trovati;
}

describe('valori del movimento', () => {
  it('niente dura abbastanza da farsi aspettare', () => {
    // Oltre i ~260 ms un ingresso smette di sembrare una risposta e comincia a
    // sembrare un'attesa.
    for (const durata of Object.values(Durations)) {
      expect(durata).toBeLessThanOrEqual(260);
    }
  });

  it('la cascata delle liste resta corta', () => {
    const attesaTotale = Stagger.step * Stagger.maxItems;
    expect(attesaTotale).toBeLessThanOrEqual(100); // prima era 440 ms
  });

  it('le molle degli ingressi non rimbalzano', () => {
    // Un rapporto damping/stiffness troppo basso fa superare il punto di
    // arrivo: è esattamente il «molleggiante» segnalato. `bouncy` è l'unica
    // che può permetterselo, ed è riservata al singolo elemento in evidenza.
    for (const nome of ['press', 'gentle'] as const) {
      const { damping, stiffness, mass } = Springs[nome];
      const critico = 2 * Math.sqrt(stiffness * mass);
      expect(damping).toBeGreaterThanOrEqual(critico * 0.85);
    }
  });
});

/**
 * Toglie commenti e stringhe: la regola riguarda il CODICE.
 * Senza questo, un commento che cita il vecchio difetto («prima era
 * .springify()…») farebbe fallire il test — cioè spiegare l'errore
 * diventerebbe vietato quanto commetterlo.
 */
function soloCodice(sorgente: string): string {
  return sorgente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

describe('nessuna animazione scritta a mano', () => {
  const file = schermateEComponenti();

  it('trova i file da controllare', () => {
    expect(file.length).toBeGreaterThan(20);
  });

  it('nessuno costruisce molle per conto suo', () => {
    const colpevoli = file.filter((f) => soloCodice(fs.readFileSync(f, 'utf8')).includes('.springify()'));
    expect(colpevoli.map((f) => path.relative(RADICE, f))).toEqual([]);
  });

  it('nessuno scrive durate a mano nelle animazioni di ingresso', () => {
    // `FadeIn.duration(160)`, `ZoomIn.duration(150)`… ognuna con un numero
    // leggermente diverso dalle altre: è così che il movimento si sfilaccia.
    const espressione = /\b(FadeIn|FadeOut|FadeInDown|FadeInUp|FadeOutDown|SlideInDown|ZoomIn)\w*\.(duration|delay)\(/;
    const colpevoli = file.filter((f) => espressione.test(soloCodice(fs.readFileSync(f, 'utf8'))));
    expect(colpevoli.map((f) => path.relative(RADICE, f))).toEqual([]);
  });
});
