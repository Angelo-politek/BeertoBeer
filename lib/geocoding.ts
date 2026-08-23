import type { City } from '@/lib/cities';
import type { Coords } from '@/lib/location';

/**
 * Ricerca indirizzi via Nominatim (OpenStreetMap): gratuito, senza chiave e
 * senza carta di credito. In cambio la loro usage policy chiede due cose che
 * qui vanno rispettate alla lettera, perché il prezzo del contrario è il blocco
 * dell'IP — cioè nessuno che riesce più a pubblicare un giro:
 *
 *   1. un User-Agent che identifichi l'applicazione E un contatto;
 *   2. non più di una richiesta al secondo.
 *
 * Con quattro amici non succedeva niente; con cinquanta persone che cercano un
 * indirizzo il sabato sera, succede.
 */
const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'BeerToBeer/1.0 (+https://github.com/Angelo-politek/BeertoBeer)',
};

/** Distanza minima fra due chiamate. 1.1s per stare larghi sul limite di 1/s. */
const MIN_INTERVAL_MS = 1100;

let lastCallAt = 0;
let coda: Promise<unknown> = Promise.resolve();

/**
 * Accoda le chiamate e le distanzia. Serializzare è voluto: due richieste
 * partite insieme violerebbero il limite anche rispettando ognuna il proprio
 * ritardo.
 */
function conLimite<T>(fn: () => Promise<T>): Promise<T> {
  const turno = coda.then(async () => {
    const attesa = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (attesa > 0) await new Promise((resolve) => setTimeout(resolve, attesa));
    lastCallAt = Date.now();
  });
  coda = turno.catch(() => undefined);
  return turno.then(fn);
}

/**
 * Esito della ricerca. Prima "indirizzo inesistente" e "servizio irraggiungibile"
 * tornavano entrambi `null`: all'utente veniva detto che il suo indirizzo non
 * esiste anche quando il problema era la rete o un blocco per troppe richieste.
 * Distinguerli permette di dire la verità.
 */
export type GeocodeResult =
  | { ok: true; coords: Coords }
  | { ok: false; motivo: 'non-trovato' }
  | { ok: false; motivo: 'servizio' };

/** Bounding box `left,top,right,bottom` (lng/lat) attorno al centro città. */
function cityViewbox(city: City): string {
  const dLat = city.radiusKm / 111;
  const dLng = city.radiusKm / (111 * Math.cos((city.center.lat * Math.PI) / 180));
  const left = city.center.lng - dLng;
  const right = city.center.lng + dLng;
  const top = city.center.lat + dLat;
  const bottom = city.center.lat - dLat;
  return `${left},${top},${right},${bottom}`;
}

/**
 * Indirizzo → coordinate. Se viene passata una città la ricerca è VINCOLATA
 * alla sua bounding box (viewbox + bounded=1): "Via Roma" trova quella della
 * città selezionata, non un'omonima a 300 km.
 */
export async function geocodeAddress(address: string, city?: City): Promise<GeocodeResult> {
  const q = address.trim();
  if (!q) return { ok: false, motivo: 'non-trovato' };

  const query = city ? `${q}, ${city.label}` : q;
  let url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;
  if (city) {
    url += `&viewbox=${cityViewbox(city)}&bounded=1`;
  }

  try {
    const res = await conLimite(() => fetch(url, { headers: NOMINATIM_HEADERS }));
    // 429 = troppe richieste, 403 = bloccati: è un problema nostro, non dell'indirizzo.
    if (!res.ok) return { ok: false, motivo: 'servizio' };
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(data) || data.length === 0) return { ok: false, motivo: 'non-trovato' };
    return { ok: true, coords: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } };
  } catch {
    return { ok: false, motivo: 'servizio' };
  }
}

type ReverseResult = {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

/**
 * Coordinate → indirizzo leggibile e breve ("Via Po 12, Torino"). Qui `null`
 * va benissimo: se la via non si ricava, il punto di consegna resta comunque
 * valido e l'utente completa a mano.
 */
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=json&addressdetails=1&lat=${coords.lat}&lon=${coords.lng}`;

  try {
    const res = await conLimite(() => fetch(url, { headers: NOMINATIM_HEADERS }));
    if (!res.ok) return null;
    const data = (await res.json()) as ReverseResult;
    const a = data.address;
    if (a?.road) {
      const via = a.house_number ? `${a.road} ${a.house_number}` : a.road;
      const luogo = a.suburb || a.city || a.town || a.village;
      return luogo ? `${via}, ${luogo}` : via;
    }
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
