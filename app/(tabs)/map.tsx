import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddShopModal } from '@/components/add-shop-modal';
import { CityPicker } from '@/components/city-picker';
import { EmptyState } from '@/components/empty-state';
import { DiscoveryFilterBar } from '@/components/discovery-filter-bar';
import { FeedMap } from '@/components/feed-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addShop, deleteShop, getCurrentUser, getShops, type Shop } from '@/data/api';
import { useToast } from '@/components/toast';
import { useSession } from '@/lib/auth-context';
import { useCity } from '@/lib/city-context';
import { useDiscoveryFilters } from '@/lib/discovery-context';
import { requestMatchesFilters, sortDiscovery } from '@/lib/discovery';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import type { BeerRequest } from '@/types';
import { getDiscoveryRequests, getDiscoveryShops, invalidateDiscovery } from '@/lib/discovery-cache';

export default function MapScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const { city, setCityKey } = useCity();
  const [requests, setRequests] = useState<BeerRequest[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const { filters } = useDiscoveryFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [addingShop, setAddingShop] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRequests, nextShops] = await Promise.all([getDiscoveryRequests(city.key), getDiscoveryShops(city.key)]);
      setRequests(nextRequests);
      setShops(nextShops);
      setError(null);
    } catch {
      setError('La mappa non è disponibile. Controlla la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  }, [city.key]);

  useEffect(() => {
    getCurrentCoords().then(setCoords).catch(() => setCoords(null));
    getCurrentUser().then((user) => setIsAdmin(Boolean(user.isAdmin))).catch(() => null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleRequests = useMemo(
    () => sortDiscovery(requests.map((request) => ({
        ...request,
        distanzaKm: coords && request.lat != null && request.lng != null
          ? haversineKm(coords, { lat: request.lat, lng: request.lng })
          : undefined,
      })).filter((request) => requestMatchesFilters(request, filters)), filters),
    [coords, requests, filters],
  );

  async function handleAddShop(input: { nome: string; coords: Coords; orari?: string }) {
    setAddingShop(true);
    try {
      await addShop({ nome: input.nome, citta: city.key, lat: input.coords.lat, lng: input.coords.lng, orari: input.orari });
      invalidateDiscovery(city.key);
      setAddShopOpen(false);
      setShops(await getShops(city.key));
      toast.show('Segnalazione inviata. La community la vedrà dopo la verifica.');
    } catch {
      toast.show('Segnalazione non inviata. Riprova.', 'error');
    } finally {
      setAddingShop(false);
    }
  }

  function handleDeleteShop(shop: Shop) {
    Alert.alert('Rimuovere il negozio?', shop.nome, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteShop(shop.id);
            invalidateDiscovery(city.key);
            setShops((current) => current.filter((item) => item.id !== shop.id));
          } catch {
            toast.show('Rimozione non riuscita.', 'error');
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="label">LA CITTÀ, SENZA RUMORE</ThemedText>
            <ThemedText type="title">MAPPA</ThemedText>
          </View>
          <CityPicker selectedKey={city.key} onSelect={setCityKey} />
        </View>
        <View style={styles.filters}><DiscoveryFilterBar /></View>
        {loading ? (
          <View style={styles.center}><ThemedText>Sto preparando la città.</ThemedText></View>
        ) : error ? (
          <View style={styles.center}><EmptyState icon="x-mark" title="Mappa ferma" message={error} /></View>
        ) : (
          <FeedMap
            city={city}
            requests={visibleRequests}
            shops={shops}
            userCoords={coords}
            onOpenRequest={(id) => router.push({ pathname: '/request/[id]', params: { id } })}
            canDeleteShop={(shop) => isAdmin || shop.createdBy === session?.user.id}
            onDeleteShop={handleDeleteShop}
            onAddShop={() => setAddShopOpen(true)}
          />
        )}
      </SafeAreaView>
      <AddShopModal
        visible={addShopOpen}
        city={city}
        loading={addingShop}
        userCoords={coords}
        onClose={() => setAddShopOpen(false)}
        onSubmit={handleAddShop}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  filters: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
});
