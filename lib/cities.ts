import { haversineKm, type Coords } from '@/lib/location';

/**
 * Città supportate dall'app. La chiave (`key`) viene salvata in orders.citta
 * e nelle preferenze locali: non cambiarla per città esistenti. Per aggiungere
 * una città basta una riga qui (centro + raggio urbano approssimativo).
 */
export type City = {
  key: string;
  label: string;
  center: Coords;
  /** Raggio entro cui un indirizzo è considerato "in città" (km). */
  radiusKm: number;
};

/**
 * ATTENZIONE: questi valori devono coincidere con la tabella `city_bounds`
 * nella migrazione 20260831_regole_e_limiti.sql, che e' quella che il database
 * applica davvero. Il test lib/__tests__/confini-citta.test.ts fallisce se
 * divergono.
 *
 * I raggi sono stati stretti dopo il collaudo: a 15 km il cerchio di Torino si
 * mangiava mezza provincia, e un indirizzo a Moncalieri veniva accettato.
 * Un cerchio resta pero' uno strumento grezzo (Collegno e Settimo distano dal
 * centro quanto i quartieri piu' esterni di Torino): il filtro preciso e' il
 * nome del comune restituito dal geocoder, in lib/geocoding.ts.
 */
export const CITIES: City[] = [
  { key: 'torino', label: 'Torino', center: { lat: 45.0703, lng: 7.6869 }, radiusKm: 11 },
  { key: 'milano', label: 'Milano', center: { lat: 45.4642, lng: 9.19 }, radiusKm: 13 },
  { key: 'roma', label: 'Roma', center: { lat: 41.9028, lng: 12.4964 }, radiusKm: 16 },
  { key: 'bologna', label: 'Bologna', center: { lat: 44.4949, lng: 11.3426 }, radiusKm: 10 },
];

export const DEFAULT_CITY_KEY = 'torino';

/** Città dalla chiave, con fallback alla default se la chiave è sconosciuta. */
export function getCity(key: string | null | undefined): City {
  return CITIES.find((c) => c.key === key) ?? CITIES.find((c) => c.key === DEFAULT_CITY_KEY)!;
}

export function isWithinCity(coords: Coords, city: City): boolean {
  return haversineKm(coords, city.center) <= city.radiusKm;
}

/** La città supportata più vicina alle coordinate (per proporre la default dal GPS). */
export function nearestCity(coords: Coords): City {
  return CITIES.reduce((best, c) =>
    haversineKm(coords, c.center) < haversineKm(coords, best.center) ? c : best,
  );
}
