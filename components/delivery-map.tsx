import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';

import { BrandIcon } from '@/components/ui/brand-icon';
import { BEER_TO_BEER_MAP_STYLE } from '@/constants/map-style';
import { useColors } from '@/hooks/use-colors';

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
      <Map mapStyle={BEER_TO_BEER_MAP_STYLE as never} style={styles.map}>
        <Camera initialViewState={{ center: [lng, lat], zoom }} />
        <Marker lngLat={[lng, lat]}>
          <View style={[styles.pin, { backgroundColor: c.accent, borderColor: c.text }]}>
            <BrandIcon name="pin" size={20} color={c.accentText} />
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
