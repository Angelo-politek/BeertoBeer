import fs from 'fs';
import path from 'path';

import { GLOSSARY } from '@/constants/branding';

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
