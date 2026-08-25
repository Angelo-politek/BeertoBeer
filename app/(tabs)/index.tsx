import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { NovitaBanner } from '@/components/novita-banner';
import { CityPicker } from '@/components/city-picker';
import { EmptyState } from '@/components/empty-state';
import { DiscoveryFilterBar } from '@/components/discovery-filter-bar';
import { RequestCard } from '@/components/request-card';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon } from '@/components/ui/brand-icon';
import { GLOSSARY } from '@/constants/branding';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radii, Spacing } from '@/constants/theme';
import { getEvents, getMyOrders, getNotifications, getUscite } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useCity } from '@/lib/city-context';
import { useDiscoveryFilters } from '@/lib/discovery-context';
import { nextOrderAction, requestMatchesFilters, sortDiscovery } from '@/lib/discovery';
import { useSession } from '@/lib/auth-context';
import { getDiscoveryRequests } from '@/lib/discovery-cache';
import { Avatar } from '@/components/avatar';
import { useFoglioUscita } from '@/lib/foglio-uscita-context';
import { finoAlle, formaDi } from '@/lib/uscite';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import { STATO_LABEL, giroChiuso } from '@/lib/orders';
import type { BeerEvent, BeerRequest, Uscita } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const c = useColors();
  const { city, setCityKey } = useCity();
  const [requests, setRequests] = useState<BeerRequest[]>([]);
  const [myOrders, setMyOrders] = useState<BeerRequest[]>([]);
  const [events, setEvents] = useState<BeerEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [coords, setCoords] = useState<Coords | null>(null);
  const { filters } = useDiscoveryFilters();
  const { session } = useSession();
  const { apri, mia } = useFoglioUscita();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uscite, setUscite] = useState<Uscita[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getCurrentCoords().then(setCoords).catch(() => null); }, []);

  /**
   * Vero finché il feed non ha mai mostrato niente.
   *
   * Prima ogni ritorno sulla schermata faceva `setLoading(true)`: la lista si
   * svuotava, poi si riempiva, e TUTTE le card rientravano in scena con la
   * loro animazione. È metà della sensazione di lentezza segnalata al
   * collaudo. Ora lo scheletro compare solo quando davvero non c'è niente da
   * guardare; gli altri aggiornamenti avvengono sotto, senza far ballare
   * quello che l'utente sta già leggendo.
   */
  const maiCaricato = useRef(true);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (maiCaricato.current) setLoading(true);
    try {
      const [available, mine, nextEvents, fuori] = await Promise.all([
        getDiscoveryRequests(city.key, refresh),
        getMyOrders(),
        getEvents(city.key).catch(() => []),
        // Chi e' fuori puo' non caricare senza portarsi dietro tutto il feed:
        // e' una sezione, non la schermata.
        getUscite(city.key).catch(() => [] as Uscita[]),
      ]);
      setRequests(available);
      setMyOrders(mine);
      setEvents(nextEvents);
      setUscite(fuori);
      getNotifications().then((items) => setUnread(items.filter((item) => !item.readAt).length)).catch(() => setUnread(0));
      setError(null);
    } catch {
      setError('La città non risponde. Riprova tra poco.');
    } finally {
      maiCaricato.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [city.key]);

  // Cambiare città cambia tutto il contenuto: lì lo scheletro ci vuole, o si
  // resta a fissare i giri della città di prima mentre arrivano quelli nuovi.
  useEffect(() => { maiCaricato.current = true; }, [city.key]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const actionableOrders = useMemo(() => myOrders
    .filter((order) => !giroChiuso(order))
    .map((order) => ({ order, action: nextOrderAction(order, session?.user.id) }))
    .sort((a, b) => b.action.priority - a.action.priority), [myOrders, session?.user.id]);
  const activeOrder = actionableOrders[0];
  const visibleRequests = useMemo(() => {
    const withDistance = requests.map((request) => ({
      ...request,
      distanzaKm: coords && request.lat != null && request.lng != null
        ? haversineKm(coords, { lat: request.lat, lng: request.lng })
        : undefined,
    })).filter((request) => requestMatchesFilters(request, filters));
    return sortDiscovery(withDistance, filters);
  }, [coords, requests, filters]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={loading ? [] : visibleRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              {/* Dopo un aggiornamento: cosa e cambiato, una volta sola. */}
              <NovitaBanner />
              <View style={styles.brandRow}>
                <Image source={require('../../assets/brand/wordmark.png')} style={styles.wordmark} contentFit="contain" />
                <View style={styles.headerActions}><CityPicker selectedKey={city.key} onSelect={setCityKey} /><PressableScale accessibilityRole="button" accessibilityLabel={`Notifiche${unread ? `, ${unread} non lette` : ''}`} onPress={() => router.push('/notifications' as never)} style={[styles.bell, { borderColor: c.border }]}><BrandIcon name="bell" size={22} color={c.text} />{unread ? <View style={[styles.unread, { backgroundColor: c.danger }]}><ThemedText style={styles.unreadText}>{Math.min(unread, 9)}</ThemedText></View> : null}</PressableScale></View>
              </View>

              <View style={styles.hero}>
                <ThemedText type="label">RADAR DELLA SERATA</ThemedText>
                <ThemedText type="title" style={styles.heroTitle}>{`${visibleRequests.length} ${(visibleRequests.length === 1 ? GLOSSARY.delivery : GLOSSARY.deliveryPlural).toUpperCase()} IN ZONA`}</ThemedText>
                {/* Azione principale isolata: prima era affiancata da un'icona
                    tonda senza etichetta, di peso visivo simile, e non era
                    chiaro quale delle due fosse "la cosa da fare". Sotto, una
                    riga che dice cosa succede dopo averla premuta. */}
                <Button
                  label={GLOSSARY.createDeliveryAction}
                  onPress={() => router.push('/create-request')}
                />
                <ThemedText type="caption">{GLOSSARY.createDeliveryHint}</ThemedText>
                <PressableScale onPress={() => router.push('/my-orders')} style={styles.secondaryAction}>
                  <BrandIcon name="scooter" size={20} color={c.textSecondary} />
                  <ThemedText type="defaultSemiBold" style={{ color: c.textSecondary }}>
                    {`I miei ${GLOSSARY.deliveryPlural}`}
                  </ThemedText>
                </PressableScale>
              </View>

              {activeOrder ? (
                <PressableScale onPress={() => router.push({ pathname: '/request/[id]', params: { id: activeOrder.order.id } })} style={[styles.activeOrder, { backgroundColor: c.accent }]}>
                  <View style={styles.activeIcon}><BrandIcon name="bottle" size={24} color={c.accentText} /></View>
                  <View style={styles.flex}>
                    <ThemedText type="label" style={{ color: c.accentText }}>{`${GLOSSARY.delivery.toUpperCase()} ATTIVO`}</ThemedText>
                    <ThemedText type="subtitle" style={{ color: c.accentText }}>{activeOrder.action.label}</ThemedText>
                    <ThemedText style={{ color: c.accentText, opacity: 0.72 }}>{STATO_LABEL[activeOrder.order.stato]}{actionableOrders.length > 1 ? ` · altri ${actionableOrders.length - 1}` : ''}</ThemedText>
                  </View>
                  <BrandIcon name="arrow-right" size={22} color={c.accentText} />
                </PressableScale>
              ) : null}

              {/*
                CHI E' FUORI ADESSO.
                Sta SOPRA i giri, e non e' un vezzo: e' la tesi della V3 messa
                in ordine di lettura. Una citta' in cui non c'e' scritto niente
                sembra rotta; una citta' in cui qualcuno ha detto «passo dal
                negozio» sembra viva, anche se nessuno ha ancora chiesto nulla.
              */}
              <View style={styles.sectionHead}>
                <View><ThemedText type="label">ADESSO</ThemedText><ThemedText type="title">CHI È FUORI</ThemedText></View>
                {mia ? null : (
                  <PressableScale onPress={() => apri()} style={styles.mapLink}>
                    <BrandIcon name="cheers" size={18} color={c.accent} />
                    <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>Ci sono anch’io</ThemedText>
                  </PressableScale>
                )}
              </View>
              {uscite.length === 0 ? (
                <Pressable onPress={() => apri()} style={[styles.vuotoFuori, { borderColor: c.border }]}>
                  <ThemedText style={{ color: c.textSecondary }}>
                    A {city.label} in questo momento non è fuori nessuno. Ci vogliono quindici secondi.
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>Sono fuori</ThemedText>
                </Pressable>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fuoriRiga}>
                  {uscite.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.persona.id } })}
                      style={[styles.fuoriCard, { backgroundColor: c.surface }]}>
                      <Avatar name={u.persona.nome} uri={u.persona.fotoUrl} size={40} />
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>{u.persona.nome}</ThemedText>
                      <ThemedText type="caption" style={{ color: c.textSecondary }} numberOfLines={1}>
                        {formaDi(u.tipo).breve} · {finoAlle(u.finisceAlle)}
                      </ThemedText>
                      {u.zona ? (
                        <ThemedText type="caption" style={{ color: c.textSecondary }} numberOfLines={1}>{u.zona}</ThemedText>
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <View style={styles.sectionHead}>
                <View><ThemedText type="label">VICINO A TE</ThemedText><ThemedText type="title">{`${GLOSSARY.deliveryPlural.toUpperCase()} APERTI`}</ThemedText></View>
                <PressableScale onPress={() => router.push('/(tabs)/map' as never)} style={styles.mapLink}>
                  <BrandIcon name="pin" size={18} color={c.accent} /><ThemedText type="defaultSemiBold" style={{ color: c.accent }}>Mappa</ThemedText>
                </PressableScale>
              </View>
              <DiscoveryFilterBar />
              {loading ? <View style={styles.loading}><SkeletonCard /><SkeletonCard /></View> : null}
              {error ? <EmptyState icon="x-mark" title="Feed fermo" message={error} /> : null}
            </View>
          }
          renderItem={({ item }) => <RequestCard request={item} onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })} />}
          ListEmptyComponent={!loading && !error ? <EmptyState icon="bottle" title="Nessuno ha ancora chiesto niente" message={`Sii tu il primo: ${GLOSSARY.createDeliveryHint.toLowerCase()}`} actionLabel={GLOSSARY.createDeliveryAction} onAction={() => router.push('/create-request')} /> : null}
          ListFooterComponent={
            <PressableScale onPress={() => router.push('/(tabs)/community' as never)} style={[styles.community, { backgroundColor: c.surface }]}>
              <View style={styles.communityText}>
                <ThemedText type="label">COMMUNITY</ThemedText>
                <ThemedText type="title">FUORI DAL FEED</ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>
                  {events[0] ? `Prossimo incontro: ${events[0].titolo}` : 'Incontri e bacheca della tua città.'}
                </ThemedText>
              </View>
              {/* sticker-b2b originale era tagliato in basso: qui usiamo il simbolo del brand, completo. */}
              <Image source={require('../../assets/brand/sticker-community.png')} style={styles.sticker} contentFit="contain" />
              <BrandIcon name="arrow-right" size={24} color={c.accent} />
            </PressableScale>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1 }, content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  headerContent: { gap: Spacing.md }, brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { width: 104, height: 48 }, hero: { paddingVertical: 2, gap: Spacing.sm }, heroTitle: { fontSize: 36, lineHeight: 38, maxWidth: 320 },
  secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs }, flex: { flex: 1 }, roundAction: { width: 54, height: 54, borderWidth: 1.5, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  activeOrder: { minHeight: 78, padding: Spacing.md, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, activeIcon: { width: 34, alignItems: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.sm }, mapLink: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: Spacing.sm },
  filters: { flexDirection: 'row', gap: Spacing.sm }, loading: { gap: Spacing.md },
  fuoriRiga: { gap: Spacing.sm, paddingVertical: 2 },
  fuoriCard: { width: 132, borderRadius: 12, padding: Spacing.sm, gap: 3 },
  vuotoFuori: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: Spacing.md, gap: 6 },
  community: { marginTop: Spacing.xl, minHeight: 150, padding: Spacing.md, borderRadius: Radii.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  communityText: { flex: 1, gap: 4, zIndex: 1 }, sticker: { width: 86, height: 70, opacity: 0.9 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, bell: { width: 44, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, unread: { position: 'absolute', right: -3, top: -3, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, unreadText: { color: '#F4F1EA', fontSize: 10 },
});
