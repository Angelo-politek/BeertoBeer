import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

/** Distanza geodetica in km tra due coordinate (formula dell'emisenoverso). */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371; // raggio terrestre in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Posizione corrente del dispositivo. Ritorna null se il permesso è negato o
 * se la lettura fallisce (così la UI può degradare senza crashare).
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
