import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-colors';
import type { City } from '@/lib/cities';
import type { Shop } from '@/data/api';
import type { BeerRequest } from '@/types';

// Stesso style gratuito delle altre mappe (OpenFreeMap, attribuzione OSM inclusa).
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Props = {
  city: City;
  requests: BeerRequest[];
  shops: Shop[];
  onRequestPress: (id: string) => void;
  onShopPress: (shop: Shop) => void;
  onAddShop: () => void;
};

/**
 * Vista mappa del feed: marker per le richieste aperte (coordinate arrotondate
 * ~1 km: mostrano la zona, non il punto esatto) e per i negozi segnalati dalla
 * community ("bangladini").
 */
export function FeedMap({ city, requests, shops, onRequestPress, onShopPress, onAddShop }: Props) {
  const c = useColors();

  return (
    <View style={styles.wrap}>
      <Map mapStyle={MAP_STYLE_URL} style={styles.map}>
        <Camera initialViewState={{ center: [city.center.lng, city.center.lat], zoom: 12 }} />

        {shops.map((shop) => (
          <Marker key={`shop-${shop.id}`} lngLat={[shop.lng, shop.lat]}>
            <Pressable onPress={() => onShopPress(shop)} hitSlop={6} style={styles.shopMarker}>
              <Text style={styles.shopIcon}>🏪</Text>
            </Pressable>
          </Marker>
        ))}

        {requests.map((request) =>
          request.lat != null && request.lng != null ? (
            <Marker key={request.id} lngLat={[request.lng, request.lat]}>
              <Pressable
                onPress={() => onRequestPress(request.id)}
                hitSlop={6}
                style={[styles.requestMarker, { backgroundColor: c.accent, borderColor: '#fff' }]}>
                <Text style={[styles.requestLabel, { color: c.accentText }]}>
                  🍺 {request.creditiOfferti}
                </Text>
              </Pressable>
            </Marker>
          ) : null,
        )}
      </Map>

      <Pressable
        onPress={onAddShop}
        style={({ pressed }) => [
          styles.addShop,
          { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="defaultSemiBold">+ 🏪 Negozio</ThemedText>
      </Pressable>

      <View style={[styles.legend, { backgroundColor: c.surface, borderColor: c.border }]}>
        <ThemedText style={{ fontSize: 12 }}>🍺 richieste (zona ~1 km) · 🏪 negozi</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  requestMarker: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requestLabel: { fontSize: 13, fontWeight: '700' },
  shopMarker: { alignItems: 'center', justifyContent: 'center' },
  shopIcon: { fontSize: 22 },
  addShop: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
