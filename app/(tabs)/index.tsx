import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddShopModal } from '@/components/add-shop-modal';
import { Button } from '@/components/button';
import { CityPicker } from '@/components/city-picker';
import { EmptyState } from '@/components/empty-state';
import { FeedMap } from '@/components/feed-map';
import { RequestCard } from '@/components/request-card';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radii, Spacing } from '@/constants/theme';
import { addShop, deleteShop, getCurrentUser, getRequests, getShops, type Shop } from '@/data/api';
import { useColors, useShadows } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { nearestCity } from '@/lib/cities';
import { useCity } from '@/lib/city-context';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import type { BeerRequest } from '@/types';

export default function FeedScreen() {
  const router = useRouter();
  const colors = useColors();
  const sh = useShadows();
  const toast = useToast();
  const { session } = useSession();
  const { city, ready, hasChosen, setCityKey } = useCity();
  const [requests, setRequests] = useState<BeerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vibeOnly, setVibeOnly] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [shops, setShops] = useState<Shop[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [addingShop, setAddingShop] = useState(false);

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
    getCurrentUser()
      .then((u) => setIsAdmin(!!u.isAdmin))
      .catch(() => null);
  }, []);

  // Negozi della città per la vista mappa.
  useEffect(() => {
    getShops(city.key).then(setShops).catch(() => setShops([]));
  }, [city.key]);

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

  async function handleAddShop(input: { nome: string; coords: Coords; orari?: string }) {
    setAddingShop(true);
    try {
      await addShop({
        nome: input.nome,
        citta: city.key,
        lat: input.coords.lat,
        lng: input.coords.lng,
        orari: input.orari,
      });
      setAddShopOpen(false);
      setShops(await getShops(city.key));
      toast.show('Negozio proposto: sarà visibile dopo l’approvazione');
    } catch {
      toast.show('Negozio non aggiunto, riprova', 'error');
    } finally {
      setAddingShop(false);
    }
  }

  function handleDeleteShop(shop: Shop) {
    Alert.alert(`Eliminare "${shop.nome}"?`, 'Il negozio sparirà dalla mappa.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteShop(shop.id);
            setShops((current) => current.filter((s) => s.id !== shop.id));
            toast.show('Negozio eliminato');
          } catch {
            toast.show('Eliminazione non riuscita', 'error');
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header hero */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="label">La tua zona 🍺</ThemedText>
            <ThemedText type="title">Richieste</ThemedText>
          </View>
          <PressableScale
            onPress={() => router.push('/create-request')}
            pressedScale={0.92}
            style={[styles.newButton, { backgroundColor: colors.accent }, sh.fab]}>
            <Text style={[styles.newButtonText, { color: colors.accentText }]}>+ Nuova</Text>
          </PressableScale>
        </Animated.View>

        {/* Filtri */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.tools}>
          <CityPicker selectedKey={city.key} onSelect={setCityKey} />
          <View style={styles.toolsRight}>
            <Chip
              label={viewMode === 'list' ? '🗺 Mappa' : '☰ Lista'}
              onPress={() => setViewMode((mode) => (mode === 'list' ? 'map' : 'list'))}
            />
            <Chip label="✨ Vibe" active={vibeOnly} onPress={() => setVibeOnly((value) => !value)} />
          </View>
        </Animated.View>

        <PressableScale
          onPress={() => router.push('/my-orders')}
          haptic={false}
          pressedScale={0.98}
          style={styles.myOrders}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.accentStrong, fontSize: 14 }}>
            I miei ordini →
          </ThemedText>
        </PressableScale>

        {loading ? (
          <View style={styles.skeletons}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <EmptyState emoji="😵" title="Ops, qualcosa è andato storto" message={error} />
            <Button label="Riprova" size="md" variant="secondary" onPress={() => load()} />
          </View>
        ) : viewMode === 'map' ? (
          <FeedMap
            city={city}
            requests={visibleRequests}
            shops={shops}
            onOpenRequest={(id) => router.push({ pathname: '/request/[id]', params: { id } })}
            canDeleteShop={(shop) => isAdmin || shop.createdBy === session?.user.id}
            onDeleteShop={handleDeleteShop}
            onAddShop={() => setAddShopOpen(true)}
          />
        ) : (
          <FlatList
            data={visibleRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
            renderItem={({ item, index }) => (
              <RequestCard
                request={item}
                index={index}
                onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                emoji="🌵"
                title={`Nessuna richiesta a ${city.label}`}
                message="Quando qualcuno pubblica una richiesta di birre in questa città, comparirà qui. Puoi cambiare città dal selettore in alto."
              />
            }
          />
        )}
      </SafeAreaView>

      <AddShopModal
        visible={addShopOpen}
        city={city}
        loading={addingShop}
        onClose={() => setAddShopOpen(false)}
        onSubmit={handleAddShop}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md + 4,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  newButton: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  toolsRight: { flexDirection: 'row', gap: Spacing.sm },
  myOrders: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md + 4,
    paddingBottom: Spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: Spacing.md, gap: Spacing.sm },
  skeletons: { padding: Spacing.md, gap: Spacing.md },
  list: { paddingHorizontal: Spacing.md, paddingTop: 4, paddingBottom: Spacing.xl, gap: Spacing.md },
});
