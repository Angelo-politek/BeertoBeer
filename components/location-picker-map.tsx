import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import type { Coords } from '@/lib/location';

// Stesso style gratuito di delivery-map (OpenFreeMap, attribuzione OSM inclusa).
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Props = {
  /** Centro iniziale della mappa (tipicamente il centro della città selezionata). */
  center: Coords;
  /** Chiamata a ogni tap sulla mappa con le coordinate scelte. */
  onPick: (coords: Coords) => void;
  zoom?: number;
};

/**
 * Mappa interattiva per scegliere il punto di consegna: un tap posiziona (o
 * sposta) il marker. Il punto scelto viene notificato via onPick; la conferma
 * e il reverse geocoding sono responsabilità del chiamante.
 */
export function LocationPickerMap({ center, onPick, zoom = 12 }: Props) {
  const c = useColors();
  const [picked, setPicked] = useState<Coords | null>(null);

  return (
    <Map
      mapStyle={MAP_STYLE_URL}
      style={styles.map}
      onPress={(event) => {
        const [lng, lat] = event.nativeEvent.lngLat;
        const coords = { lat, lng };
        setPicked(coords);
        onPick(coords);
      }}>
      <Camera initialViewState={{ center: [center.lng, center.lat], zoom }} />
      {picked ? (
        <Marker lngLat={[picked.lng, picked.lat]}>
          <View style={styles.pin}>
            <View style={[styles.pinDot, { backgroundColor: c.accent, borderColor: '#fff' }]} />
          </View>
        </Marker>
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
});
