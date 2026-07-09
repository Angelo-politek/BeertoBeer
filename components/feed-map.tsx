import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';
import type { City } from '@/lib/cities';
import type { Shop } from '@/data/api';
import type { BeerRequest } from '@/types';

// Stesso style gratuito delle altre mappe (OpenFreeMap, attribuzione OSM inclusa).
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Selection = { kind: 'request'; request: BeerRequest } | { kind: 'shop'; shop: Shop } | null;

type Props = {
  city: City;
  requests: BeerRequest[];
  shops: Shop[];
  /** Apre il dettaglio richiesta (secondo tap, dal bottone dell'anteprima). */
  onOpenRequest: (id: string) => void;
  canDeleteShop: (shop: Shop) => boolean;
  onDeleteShop: (shop: Shop) => void;
  onAddShop: () => void;
};

/**
 * Vista mappa del feed. Il tap su un marker apre un'ANTEPRIMA in basso (niente
 * navigazione diretta dal gesto sulla mappa: evitava anche un crash da smontaggio
 * della mappa a metà gesture); da lì un secondo tap apre il dettaglio o le
 * indicazioni Google Maps per i negozi.
 */
export function FeedMap({ city, requests, shops, onOpenRequest, canDeleteShop, onDeleteShop, onAddShop }: Props) {
  const c = useColors();
  const sh = useShadows();
  const [selection, setSelection] = useState<Selection>(null);
  // Il tap su un marker si propaga ANCHE alla mappa sotto: senza questa guardia
  // l'onPress della mappa chiuderebbe subito l'anteprima appena aperta.
  const lastMarkerPressRef = useRef(0);

  function selectMarker(next: Selection) {
    lastMarkerPressRef.current = Date.now();
    setSelection(next);
  }

  function openDirections(shop: Shop) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;
    Linking.openURL(url).catch(() => null);
  }

  return (
    <View style={styles.wrap}>
      <Map
        mapStyle={MAP_STYLE_URL}
        style={styles.map}
        onPress={() => {
          if (Date.now() - lastMarkerPressRef.current < 350) return;
          setSelection(null);
        }}>
        <Camera initialViewState={{ center: [city.center.lng, city.center.lat], zoom: 12 }} />

        {shops.map((shop) => {
          const active = selection?.kind === 'shop' && selection.shop.id === shop.id;
          return (
            <Marker key={`shop-${shop.id}`} lngLat={[shop.lng, shop.lat]}>
              <Pressable
                onPress={() => selectMarker({ kind: 'shop', shop })}
                hitSlop={6}
                style={[styles.shopMarker, active && styles.markerActive]}>
                <Text style={styles.shopIcon}>🏪</Text>
              </Pressable>
            </Marker>
          );
        })}

        {requests.map((request) => {
          if (request.lat == null || request.lng == null) return null;
          const active = selection?.kind === 'request' && selection.request.id === request.id;
          return (
            <Marker key={request.id} lngLat={[request.lng, request.lat]}>
              <Pressable
                onPress={() => selectMarker({ kind: 'request', request })}
                hitSlop={6}
                style={[
                  styles.requestMarker,
                  { backgroundColor: c.accent, borderColor: c.text },
                  active && styles.markerActive,
                ]}>
                <Text style={[styles.requestLabel, { color: c.accentText }]}>
                  🍺 {request.creditiOfferti}
                </Text>
              </Pressable>
            </Marker>
          );
        })}
      </Map>

      {!selection ? (
        <>
          <Pressable
            onPress={onAddShop}
            style={({ pressed }) => [
              styles.addShop,
              { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 },
              sh.card,
            ]}>
            <ThemedText type="defaultSemiBold">+ 🏪 Spaccia Peroni</ThemedText>
          </Pressable>
          <View style={[styles.legend, { backgroundColor: c.surface }, sh.card]}>
            <ThemedText style={{ fontSize: 12 }}>🍺 richieste (zona ~1 km) · 🏪 spaccia peroni</ThemedText>
          </View>
        </>
      ) : null}

      {/* Anteprima richiesta */}
      {selection?.kind === 'request' ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          exiting={FadeOutDown.duration(150)}
          style={[styles.preview, { backgroundColor: c.surface }, sh.raised]}>
          <View style={styles.previewHeader}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.previewTitle}>
              {selection.request.host.nome} · ⭐ {selection.request.host.ratingMedio.toFixed(1)}
            </ThemedText>
            {selection.request.vibeMode ? <Badge label="✨ Vibe" tone="accent" /> : null}
            <Pressable onPress={() => setSelection(null)} hitSlop={10}>
              <ThemedText style={{ color: c.textSecondary }}>✕</ThemedText>
            </Pressable>
          </View>
          <ThemedText numberOfLines={2} style={{ color: c.textSecondary }}>
            {selection.request.birre.map((b) => `${b.quantita}× ${b.nome}`).join(' · ')}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
            {selection.request.creditiOfferti} crediti + bonus distanza
            {selection.request.distanzaKm != null ? ` · ~${selection.request.distanzaKm.toFixed(1)} km da te` : ''}
            {selection.request.fascia ? ` · ${selection.request.fascia}` : ''}
          </ThemedText>
          <Button label="Apri richiesta" onPress={() => onOpenRequest(selection.request.id)} />
        </Animated.View>
      ) : null}

      {/* Anteprima negozio */}
      {selection?.kind === 'shop' ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          exiting={FadeOutDown.duration(150)}
          style={[styles.preview, { backgroundColor: c.surface }, sh.raised]}>
          <View style={styles.previewHeader}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.previewTitle}>
              🏪 {selection.shop.nome}
            </ThemedText>
            {selection.shop.stato !== 'approvato' ? <Badge label="In attesa" tone="neutral" /> : null}
            <Pressable onPress={() => setSelection(null)} hitSlop={10}>
              <ThemedText style={{ color: c.textSecondary }}>✕</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
            {selection.shop.orari
              ? `Orari stimati: ${selection.shop.orari}`
              : 'Orari non segnalati.'}{' '}
            Segnalato dalla community.
          </ThemedText>
          <Button label="🧭 Indicazioni su Google Maps" onPress={() => openDirections(selection.shop)} />
          {canDeleteShop(selection.shop) ? (
            <Button
              label="Elimina negozio"
              variant="danger"
              onPress={() => {
                onDeleteShop(selection.shop);
                setSelection(null);
              }}
            />
          ) : null}
        </Animated.View>
      ) : null}
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
  requestLabel: { fontFamily: Fonts.sansBold, fontSize: 13 },
  markerActive: { transform: [{ scale: 1.25 }] },
  shopMarker: { alignItems: 'center', justifyContent: 'center' },
  shopIcon: { fontSize: 22 },
  addShop: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  preview: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewTitle: { flex: 1 },
});
