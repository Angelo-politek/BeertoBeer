import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { BrandIcon } from '@/components/ui/brand-icon';
import { BEER_TO_BEER_MAP_STYLE } from '@/constants/map-style';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';
import type { City } from '@/lib/cities';
import type { Coords } from '@/lib/location';
import type { Shop } from '@/data/api';
import type { BeerRequest } from '@/types';

type Selection = { kind: 'request'; request: BeerRequest } | { kind: 'shop'; shop: Shop } | null;

type Props = {
  city: City;
  requests: BeerRequest[];
  shops: Shop[];
  userCoords?: Coords | null;
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
export function FeedMap({ city, requests, shops, userCoords, onOpenRequest, canDeleteShop, onDeleteShop, onAddShop }: Props) {
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
        key={city.key}
        mapStyle={BEER_TO_BEER_MAP_STYLE as never}
        style={styles.map}
        onPress={() => {
          if (Date.now() - lastMarkerPressRef.current < 350) return;
          setSelection(null);
        }}>
        <Camera initialViewState={{ center: [city.center.lng, city.center.lat], zoom: 12 }} />

        {userCoords ? (
          <Marker lngLat={[userCoords.lng, userCoords.lat]}>
            <View style={[styles.userMarker, { backgroundColor: c.accent, borderColor: c.text }]} accessibilityLabel="La tua posizione">
              <BrandIcon name="pin" size={16} color={c.accentText} />
            </View>
          </Marker>
        ) : null}

        {shops.map((shop) => {
          const active = selection?.kind === 'shop' && selection.shop.id === shop.id;
          return (
            <Marker key={`shop-${shop.id}`} lngLat={[shop.lng, shop.lat]}>
              <Pressable
                onPress={() => selectMarker({ kind: 'shop', shop })}
                hitSlop={6}
                style={[styles.shopMarker, active && styles.markerActive]}>
                <View style={[styles.shopMarkerCore, { backgroundColor: c.positiveSoft, borderColor: c.positive }]}>
                  <BrandIcon name="cart" size={20} color={c.positive} />
                </View>
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
                <BrandIcon name="bottle" size={15} color={c.accentText} />
                <Text style={[styles.requestLabel, { color: c.accentText }]}>{request.creditiOfferti}</Text>
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
            <BrandIcon name="plus" size={16} color={c.accent} />
            <ThemedText type="defaultSemiBold">Segnala un negozio</ThemedText>
          </Pressable>
          <View style={[styles.legend, { backgroundColor: c.surface }, sh.card]}>
            <View style={styles.legendItem}><BrandIcon name="bottle" size={14} color={c.accent} /><ThemedText type="caption">Giri</ThemedText></View>
            <View style={styles.legendItem}><BrandIcon name="cart" size={14} color={c.positive} /><ThemedText type="caption">Negozi</ThemedText></View>
          </View>
        </>
      ) : null}

      {/* Anteprima richiesta */}
      {selection?.kind === 'request' ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.preview, { backgroundColor: c.surface }, sh.raised]}>
          <View style={styles.previewHeader}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.previewTitle}>
              {selection.request.host.nome} · {selection.request.host.ratingMedio.toFixed(1)} su 5
            </ThemedText>
            {selection.request.vibeMode ? <Badge label="Vibe mode" tone="accent" /> : null}
            <Pressable onPress={() => setSelection(null)} hitSlop={10}>
              <BrandIcon name="x-mark" size={18} color={c.textSecondary} />
            </Pressable>
          </View>
          <ThemedText numberOfLines={2} style={{ color: c.textSecondary }}>
            {selection.request.birre.map((b) => `${b.quantita} × ${b.nome}`).join(' · ')}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
            {selection.request.creditiOfferti} BeerCoin
            {selection.request.distanzaKm != null ? ` · ~${selection.request.distanzaKm.toFixed(1)} km da te` : ''}
            {selection.request.fascia ? ` · ${selection.request.fascia}` : ''}
          </ThemedText>
          <Button label="Apri il giro" onPress={() => onOpenRequest(selection.request.id)} />
        </Animated.View>
      ) : null}

      {/* Anteprima negozio */}
      {selection?.kind === 'shop' ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.preview, { backgroundColor: c.surface }, sh.raised]}>
          <View style={styles.previewHeader}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.previewTitle}>
              {selection.shop.nome}
            </ThemedText>
            {selection.shop.stato !== 'approvato' ? <Badge label="In attesa" tone="neutral" /> : null}
            <Pressable onPress={() => setSelection(null)} hitSlop={10}>
              <BrandIcon name="x-mark" size={18} color={c.textSecondary} />
            </Pressable>
          </View>
          <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
            {selection.shop.orari
              ? `Orari stimati: ${selection.shop.orari}`
              : 'Orari non segnalati.'}{' '}
            Segnalato dalla community.
          </ThemedText>
          <Button label="Apri le indicazioni" onPress={() => openDirections(selection.shop)} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  requestLabel: { fontFamily: Fonts.sansBold, fontSize: 13 },
  markerActive: { transform: [{ scale: 1.25 }] },
  shopMarker: { alignItems: 'center', justifyContent: 'center' },
  shopMarkerCore: { width: 38, height: 38, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  userMarker: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  addShop: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
