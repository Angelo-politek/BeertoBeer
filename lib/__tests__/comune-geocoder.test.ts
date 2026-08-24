import { nomeComune, stessoComune } from '@/lib/geocoding';

/**
 * «HO PROVATO A METTERE UN INDIRIZZO IN PROVINCIA E LO HA ACCETTATO.»
 *
 * Il controllo era per raggio: un cerchio attorno al centro città. Ma dal
 * centro di Torino, Moncalieri e Collegno distano quanto i quartieri più
 * esterni di Torino stessa — nessun raggio può separarli. Allargando si fa
 * entrare la provincia, stringendo si tagliano fuori pezzi di città.
 *
 * Il dato preciso ce l'aveva già il geocoder: il nome del comune. Costava
 * `addressdetails=1` sulla stessa richiesta, e non lo stavamo chiedendo.
 *
 * IL RISCHIO DI QUESTO CONTROLLO, ed è il motivo per cui questo test esiste:
 * se il confronto è troppo rigido rifiuta indirizzi validi. Nominatim senza
 * `accept-language=it` può rispondere «Turin», e un utente di Torino si
 * vedrebbe rifiutare casa propria.
 */

describe('nome del comune restituito dal geocoder', () => {
  it('legge il comune dai campi che lo contengono', () => {
    expect(nomeComune({ city: 'Torino' })).toBe('Torino');
    expect(nomeComune({ town: 'Moncalieri' })).toBe('Moncalieri');
    expect(nomeComune({ village: 'Pino Torinese' })).toBe('Pino Torinese');
    expect(nomeComune({ municipality: 'Rivoli' })).toBe('Rivoli');
  });

  it('NON scambia il quartiere per un comune', () => {
    // Un indirizzo di Torino può avere suburb: "San Salvario". Prenderlo per
    // comune farebbe rifiutare un indirizzo perfettamente valido.
    expect(nomeComune({ suburb: 'San Salvario', city: 'Torino' })).toBe('Torino');
    expect(nomeComune({ suburb: 'San Salvario' })).toBeNull();
  });

  it('se il geocoder non dichiara il comune, non si inventa niente', () => {
    // In quel caso il controllo si limita al raggio: meglio lasciar passare
    // che rifiutare un indirizzo giusto per un dato mancante.
    expect(nomeComune(undefined)).toBeNull();
    expect(nomeComune({})).toBeNull();
  });
});

describe('confronto fra comuni', () => {
  it('riconosce lo stesso comune scritto diversamente', () => {
    expect(stessoComune('torino', 'Torino')).toBe(true);
    expect(stessoComune('TORINO', 'Torino')).toBe(true);
    expect(stessoComune('  Torino  ', 'Torino')).toBe(true);
    expect(stessoComune('Reggio  Emilia', 'Reggio Emilia')).toBe(true);
  });

  it('ignora gli accenti, che i geocoder scrivono come vogliono', () => {
    expect(stessoComune('Forlì', 'Forli')).toBe(true);
    expect(stessoComune('Cefalù', 'CEFALU')).toBe(true);
  });

  it('distingue i comuni diversi: è il caso della segnalazione', () => {
    expect(stessoComune('Moncalieri', 'Torino')).toBe(false);
    expect(stessoComune('Rivoli', 'Torino')).toBe(false);
    expect(stessoComune('Collegno', 'Torino')).toBe(false);
  });
});
