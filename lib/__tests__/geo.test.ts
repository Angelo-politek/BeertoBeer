import { CITIES, DEFAULT_CITY_KEY, getCity, isWithinCity, nearestCity } from '@/lib/cities';
import { haversineKm } from '@/lib/location';

/**
 * Distanza e confini città decidono due cose delicate: quanti BeerCoin prende
 * chi consegna (bonus distanza) e se una richiesta può essere pubblicata.
 * Mirror di haversine_km in supabase/schema.sql.
 */

const TORINO = { lat: 45.0703, lng: 7.6869 };
const MILANO = { lat: 45.4642, lng: 9.19 };

describe('distanza geodetica', () => {
  it('è zero fra un punto e se stesso', () => {
    expect(haversineKm(TORINO, TORINO)).toBe(0);
  });

  it('Torino–Milano è circa 126 km', () => {
    expect(haversineKm(TORINO, MILANO)).toBeGreaterThan(120);
    expect(haversineKm(TORINO, MILANO)).toBeLessThan(132);
  });

  it('è simmetrica', () => {
    expect(haversineKm(TORINO, MILANO)).toBeCloseTo(haversineKm(MILANO, TORINO), 9);
  });

  it('su distanze brevi resta plausibile (1 km circa)', () => {
    // ~0.009° di latitudine ≈ 1 km
    const vicino = { lat: TORINO.lat + 0.009, lng: TORINO.lng };
    expect(haversineKm(TORINO, vicino)).toBeGreaterThan(0.9);
    expect(haversineKm(TORINO, vicino)).toBeLessThan(1.1);
  });
});

describe('confini delle città', () => {
  it('il centro di ogni città è dentro la città stessa', () => {
    for (const city of CITIES) {
      expect(isWithinCity(city.center, city)).toBe(true);
    }
  });

  it('Milano non è dentro Torino', () => {
    expect(isWithinCity(MILANO, getCity('torino'))).toBe(false);
  });

  it('un punto appena fuori raggio è escluso', () => {
    const torino = getCity('torino');
    // ~0.009° ≈ 1 km: mi allontano di raggio + 3 km
    const fuori = { lat: torino.center.lat + (torino.radiusKm + 3) * 0.009, lng: torino.center.lng };
    expect(isWithinCity(fuori, torino)).toBe(false);
  });

  it('una chiave sconosciuta ricade sulla città di default', () => {
    expect(getCity('atlantide').key).toBe(DEFAULT_CITY_KEY);
    expect(getCity(null).key).toBe(DEFAULT_CITY_KEY);
    expect(getCity(undefined).key).toBe(DEFAULT_CITY_KEY);
  });

  it('la città più vicina a Milano è Milano', () => {
    expect(nearestCity(MILANO).key).toBe('milano');
  });
});
