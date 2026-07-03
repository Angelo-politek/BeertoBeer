import type { City } from '@/lib/cities';
import type { Coords } from '@/lib/location';

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'BeerToBeer/1.0 (open-source, no-profit app)',
};

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
 * Forward geocoding via Nominatim (OpenStreetMap): indirizzo → coordinate.
 * Se viene passata una città, la ricerca è VINCOLATA alla sua bounding box
 * (viewbox + bounded=1): "Via Roma" trova quella della città selezionata,
 * non un'omonima a 300 km. Nessuna chiave/carta richiesta. Limiti d'uso:
 * ~1 richiesta/secondo e User-Agent identificativo (ok per l'MVP).
 * Ritorna null se l'indirizzo non viene trovato o la rete fallisce.
 */
export async function geocodeAddress(address: string, city?: City): Promise<Coords | null> {
  const q = address.trim();
  if (!q) return null;

  const query = city ? `${q}, ${city.label}` : q;
  let url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;
  if (city) {
    url += `&viewbox=${cityViewbox(city)}&bounded=1`;
  }

  try {
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
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
 * Reverse geocoding via Nominatim: coordinate → indirizzo leggibile e breve
 * ("Via Po 12, Torino"). Usato dal picker sulla mappa per precompilare il
 * campo indirizzo. Ritorna null se il punto non è risolvibile o la rete fallisce.
 */
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=json&addressdetails=1&lat=${coords.lat}&lon=${coords.lng}`;

  try {
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
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
