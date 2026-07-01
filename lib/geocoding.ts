import type { Coords } from '@/lib/location';

/**
 * Forward geocoding via Nominatim (OpenStreetMap): indirizzo → coordinate.
 * Nessuna chiave/carta richiesta. Limiti d'uso: ~1 richiesta/secondo e
 * User-Agent identificativo (ok per l'uso leggero dell'MVP). Ritorna null se
 * l'indirizzo non viene trovato o la rete fallisce.
 */
export async function geocodeAddress(address: string): Promise<Coords | null> {
  const q = address.trim();
  if (!q) return null;

  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BeerToBeer/1.0 (open-source, no-profit app)',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
