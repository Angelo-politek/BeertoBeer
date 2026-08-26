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
import { SISTEMA } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { addShop, deleteShop, getCurrentUser, getEvents, getShops, getUscite, type Shop } from '@/data/api';
import { useToast } from '@/components/toast';
import { useSession } from '@/lib/auth-context';
import { useCity } from '@/lib/city-context';
import { useDiscoveryFilters } from '@/lib/discovery-context';
import { requestMatchesFilters, sortDiscovery } from '@/lib/discovery';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import type { BeerEvent, BeerRequest, Uscita } from '@/types';
import { getDiscoveryRequests, getDiscoveryShops, invalidateDiscovery } from '@/lib/discovery-cache';

export default function MapScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const { city, setCityKey } = useCity();
  const [requests, setRequests] = useState<BeerRequest[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [uscite, setUscite] = useState<Uscita[]>([]);
  const [events, setEvents] = useState<BeerEvent[]>([]);
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
      // Gli incontri non devono poter far cadere la mappa: se la loro query
      // va storta, giri e negozi restano comunque visibili.
      const [nextRequests, nextShops, nextEvents, nextUscite] = await Promise.all([
        getDiscoveryRequests(city.key),
        getDiscoveryShops(city.key),
        getEvents(city.key).catch(() => [] as BeerEvent[]),
        // Stessa regola degli incontri: chi e' fuori non deve poter far cadere
        // la mappa. Se questa query va storta, giri e negozi restano.
        getUscite(city.key).catch(() => [] as Uscita[]),
      ]);
      setRequests(nextRequests);
      setShops(nextShops);
      setEvents(nextEvents);
      setUscite(nextUscite);
      setError(null);
    } catch {
      setError(SISTEMA.mappa.nonDisponibile);
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
      toast.show(SISTEMA.mappa.negozioInviato);
    } catch {
      toast.show(SISTEMA.mappa.negozioNonInviato, 'error');
    } finally {
      setAddingShop(false);
    }
  }

  function handleDeleteShop(shop: Shop) {
    Alert.alert(SISTEMA.mappa.rimuovereNegozio, shop.nome, [
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
            toast.show(SISTEMA.mappa.rimozioneNonRiuscita, 'error');
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
            <ThemedText type="label">{SISTEMA.mappa.titolo}</ThemedText>
            <ThemedText type="title">MAPPA</ThemedText>
          </View>
          <CityPicker selectedKey={city.key} onSelect={setCityKey} />
        </View>
        <View style={styles.filters}><DiscoveryFilterBar /></View>
        {loading ? (
          <View style={styles.center}><ThemedText>{SISTEMA.mappa.inCaricamento}</ThemedText></View>
        ) : error ? (
          <View style={styles.center}><EmptyState icon="x-mark" title="Mappa ferma" message={error} /></View>
        ) : (
          <FeedMap
            city={city}
            requests={visibleRequests}
            shops={shops}
            events={events}
            uscite={uscite}
            userCoords={coords}
            onOpenRequest={(id) => router.push({ pathname: '/request/[id]', params: { id } })}
            onOpenEvent={(id) =>
              // I tipi delle rotte generati da expo-router non conoscono
              // /event/[id] finche' il dev server non li rigenera; il resto del
              // progetto usa gia' questo stesso rimedio in sette punti.
              router.push({ pathname: '/event/[id]', params: { id } } as never)
            }
            onOpenPersona={(id) => router.push({ pathname: '/user/[id]', params: { id } })}
            onChiediGiro={(uscitaId) => router.push({ pathname: '/create-request', params: { a: uscitaId } })}
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
