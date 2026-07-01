import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

// Style MapLibre gratuito basato su OpenStreetMap (OpenFreeMap): nessuna chiave,
// nessuna carta di credito. L'attribuzione OSM è inclusa dallo style.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Props = {
  lat: number;
  lng: number;
  height?: number;
  zoom?: number;
};

/** Mappa interattiva con un pin sulla posizione di consegna. */
export function DeliveryMap({ lat, lng, height = 180, zoom = 14 }: Props) {
  const c = useColors();

  return (
    <View style={[styles.wrap, { height, borderColor: c.border }]}>
      <Map mapStyle={MAP_STYLE_URL} style={styles.map}>
        <Camera initialViewState={{ center: [lng, lat], zoom }} />
        <Marker lngLat={[lng, lat]}>
          <View style={styles.pin}>
            <View style={[styles.pinDot, { backgroundColor: c.accent, borderColor: '#fff' }]} />
          </View>
        </Marker>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
});
