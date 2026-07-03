import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityPicker } from '@/components/city-picker';
import { EmptyState } from '@/components/empty-state';
import { RequestCard } from '@/components/request-card';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getRequests } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { nearestCity } from '@/lib/cities';
import { useCity } from '@/lib/city-context';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import type { BeerRequest } from '@/types';

export default function FeedScreen() {
  const router = useRouter();
  const colors = useColors();
  const { city, ready, hasChosen, setCityKey } = useCity();
  const [requests, setRequests] = useState<BeerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vibeOnly, setVibeOnly] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const rows = await getRequests(city.key);
        setRequests(rows);
        setError(null);
      } catch {
        setError('Impossibile caricare le richieste. Riprova.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [city.key],
  );

  useEffect(() => {
    getCurrentCoords().then(setCoords).catch(() => setCoords(null));
  }, []);

  // Primo avvio senza città scelta: proponi quella più vicina al GPS.
  useEffect(() => {
    if (ready && !hasChosen && coords) {
      setCityKey(nearestCity(coords).key);
    }
  }, [ready, hasChosen, coords, setCityKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visibleRequests = useMemo(() => {
    return requests
      .filter((item) => !vibeOnly || item.vibeMode)
      .map((item) => {
        const distanzaKm =
          coords && item.lat != null && item.lng != null ? haversineKm(coords, { lat: item.lat, lng: item.lng }) : undefined;
        return { ...item, distanzaKm };
      })
      .sort((a, b) => (a.distanzaKm ?? Number.MAX_VALUE) - (b.distanzaKm ?? Number.MAX_VALUE));
  }, [coords, requests, vibeOnly]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="title">Richieste</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Birre da consegnare a {city.label}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/create-request')}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.6 : 1 },
            ]}>
            <Text style={[styles.newButtonText, { color: colors.accentText }]}>+ Nuova</Text>
          </Pressable>
        </View>

        <View style={styles.tools}>
          <CityPicker selectedKey={city.key} onSelect={setCityKey} />
          <Pressable onPress={() => router.push('/my-orders')} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.accent }}>
              I miei ordini
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setVibeOnly((value) => !value)}
            style={[
              styles.filter,
              { borderColor: vibeOnly ? colors.accent : colors.border, backgroundColor: vibeOnly ? colors.accentSoft : colors.surface },
            ]}>
            <ThemedText type="defaultSemiBold" style={{ color: vibeOnly ? colors.accent : colors.text }}>
              Vibe
            </ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.skeletons}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText style={{ color: colors.danger }}>{error}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={visibleRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
            renderItem={({ item }) => (
              <RequestCard
                request={item}
                onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title={`Nessuna richiesta a ${city.label}`}
                message="Quando qualcuno pubblica una richiesta di birre in questa citta, comparira qui. Puoi cambiare citta dal selettore in alto."
              />
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  subtitle: { fontSize: 15 },
  newButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonText: { fontSize: 15, fontWeight: '600' },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  skeletons: { padding: Spacing.md, gap: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.sm },
});
