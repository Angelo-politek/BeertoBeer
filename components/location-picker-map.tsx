import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandIcon } from '@/components/ui/brand-icon';
import { BEER_TO_BEER_MAP_STYLE } from '@/constants/map-style';
import { VOCE } from '@/constants/testi';
import { useColors } from '@/hooks/use-colors';
import type { Coords } from '@/lib/location';

type Props = {
  /** Centro iniziale della mappa (tipicamente il centro della città selezionata). */
  center: Coords;
  /** Chiamata a ogni tap sulla mappa con le coordinate scelte. */
  onPick: (coords: Coords) => void;
  value?: Coords | null;
  userCoords?: Coords | null;
  zoom?: number;
};

/**
 * Mappa interattiva per scegliere il punto di consegna: un tap posiziona (o
 * sposta) il marker. Il punto scelto viene notificato via onPick; la conferma
 * e il reverse geocoding sono responsabilità del chiamante.
 */
export function LocationPickerMap({ center, onPick, value, userCoords, zoom = 12 }: Props) {
  const c = useColors();
  const [picked, setPicked] = useState<Coords | null>(value ?? null);

  useEffect(() => setPicked(value ?? null), [value]);

  return (
    <Map
      mapStyle={BEER_TO_BEER_MAP_STYLE as never}
      style={styles.map}
      onPress={(event) => {
        const [lng, lat] = event.nativeEvent.lngLat;
        const coords = { lat, lng };
        setPicked(coords);
        onPick(coords);
      }}>
      <Camera initialViewState={{ center: [center.lng, center.lat], zoom }} />
      {userCoords ? (
        <Marker lngLat={[userCoords.lng, userCoords.lat]}>
          <View style={[styles.userPin, { backgroundColor: c.positive, borderColor: c.text }]} accessibilityLabel={VOCE.tuaPosizione}>
            <BrandIcon name="profile" size={17} color={c.background} />
          </View>
        </Marker>
      ) : null}
      {picked ? (
        <Marker lngLat={[picked.lng, picked.lat]}>
          <View style={[styles.pin, { backgroundColor: c.accent, borderColor: c.text }]}>
            <BrandIcon name="pin" size={22} color={c.accentText} />
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
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPin: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
