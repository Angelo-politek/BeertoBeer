import { DEFAULT_DISCOVERY_FILTERS, filtriDopoIdratazione, requestMatchesFilters } from '@/lib/discovery';

import type { BeerRequest, DiscoveryFilters } from '@/types';

/**
 * IL FILTRO CHE «NON SEMPRE» FUNZIONAVA.
 *
 * Segnalazione del fondatore: «vibe mode funzionava bene, c'era solo un
 * problema con le categorie della schermata dei giri: il filtro non sempre
 * funziona». La parola che conta è SEMPRE — un difetto che si presenta a volte
 * sì e a volte no non è un difetto capriccioso, è una corsa.
 *
 * Era questa. I filtri partono dai valori predefiniti, quelli salvati arrivano
 * dopo perché AsyncStorage è asincrono, e la barra dei filtri è già premibile
 * in quella finestra. La lettura del disco scriveva sopra qualunque cosa
 * trovasse, compresa una scelta appena fatta: chi apriva l'app e toccava
 * «Vibe mode» di fretta vedeva il filtro accendersi e rispegnersi da solo.
 *
 * Aspettando un secondo non capitava mai. Avendo fretta, spesso.
 */

const FILTRI_SALVATI: DiscoveryFilters = {
  vibeOnly: false,
  maxDistanceKm: 5,
  time: 'all',
  sort: 'scadenza',
};

describe("una scelta già fatta batte quello che c'è sul disco", () => {
  it('senza scelte, i valori salvati si applicano', () => {
    const esito = filtriDopoIdratazione(DEFAULT_DISCOVERY_FILTERS, JSON.stringify(FILTRI_SALVATI), false);
    expect(esito.maxDistanceKm).toBe(5);
  });

  it('IL DIFETTO: una scelta fatta prima che il disco risponda non si perde', () => {
    // La persona ha appena acceso «Vibe mode», il disco risponde con il valore
    // di ieri — che era spento. Prima vinceva il disco.
    const appenaScelto: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS, vibeOnly: true };
    const esito = filtriDopoIdratazione(appenaScelto, JSON.stringify(FILTRI_SALVATI), true);
    expect(esito.vibeOnly).toBe(true);
  });

  it('niente sul disco: non azzera quello che c’è a schermo', () => {
    const appenaScelto: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS, vibeOnly: true };
    expect(filtriDopoIdratazione(appenaScelto, null, false).vibeOnly).toBe(true);
  });

  it('preferenze illeggibili non buttano giù niente', () => {
    // È già successo bumpando la chiave di versione delle preferenze.
    const esito = filtriDopoIdratazione(DEFAULT_DISCOVERY_FILTERS, '{non è json', false);
    expect(esito).toEqual(DEFAULT_DISCOVERY_FILTERS);
  });

  it('una chiave salvata parziale non cancella le altre', () => {
    // Le preferenze vecchie possono avere meno campi di quelle nuove: i campi
    // mancanti devono ricadere sul default, non diventare undefined.
    const esito = filtriDopoIdratazione(DEFAULT_DISCOVERY_FILTERS, '{"vibeOnly":true}', false);
    expect(esito.vibeOnly).toBe(true);
    expect(esito.sort).toBe(DEFAULT_DISCOVERY_FILTERS.sort);
    expect(esito.time).toBe(DEFAULT_DISCOVERY_FILTERS.time);
  });
});

/** Un giro finto, quel tanto che basta al filtro. */
function giro(vibeMode: boolean): BeerRequest {
  return {
    id: 'x',
    host: { id: 'h', nome: 'Tizio' },
    driverId: null,
    birre: [],
    indirizzo: null,
    lat: null,
    lng: null,
    fascia: undefined,
    stato: 'richiesto',
    vibeMode,
    creditiOfferti: 3,
    hostConfermato: false,
    driverConfermato: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    citta: 'torino',
    statoModerazione: 'ok',
    congelato: false,
    scadeIl: null,
  } as unknown as BeerRequest;
}

describe('il filtro vibe, quando i filtri sono quelli giusti', () => {
  it('spento, passano tutti', () => {
    const filtri = { ...DEFAULT_DISCOVERY_FILTERS, vibeOnly: false };
    expect(requestMatchesFilters(giro(true), filtri)).toBe(true);
    expect(requestMatchesFilters(giro(false), filtri)).toBe(true);
  });

  it('acceso, passano solo i giri in vibe', () => {
    const filtri = { ...DEFAULT_DISCOVERY_FILTERS, vibeOnly: true };
    expect(requestMatchesFilters(giro(true), filtri)).toBe(true);
    expect(requestMatchesFilters(giro(false), filtri)).toBe(false);
  });
});
