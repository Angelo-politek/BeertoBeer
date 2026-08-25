import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon, type BrandIconName } from '@/components/ui/brand-icon';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { getCommunityFeed, getEvents } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useCity } from '@/lib/city-context';
import { formatShortDate } from '@/lib/format';
import type { BeerEvent, CommunityFeedItem } from '@/types';

type Section = 'events' | 'board';
type EventFilter = 'today' | 'week' | 'joined';

export default function CommunityScreen() {
  const router = useRouter();
  const c = useColors();
  const { city } = useCity();
  const [section, setSection] = useState<Section>('events');
  const [eventFilter, setEventFilter] = useState<EventFilter>('week');
  const [events, setEvents] = useState<BeerEvent[]>([]);
  const [feed, setFeed] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Senza questo, un caricamento fallito mostrava "Nessun incontro" e
  // "Bacheca silenziosa": indistinguibile da una città davvero ferma.
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextEvents, nextFeed] = await Promise.all([getEvents(city.key), getCommunityFeed(city.key)]);
      setEvents(nextEvents);
      setFeed(nextFeed.filter((item) => item.tipo !== 'badge'));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city.key]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const iconFor = (type: CommunityFeedItem['tipo']): BrandIconName => type === 'evento' ? 'cheers' : 'profile';
  const visibleEvents = events.filter((event) => {
    if (eventFilter === 'joined') return event.partecipo;
    const hours = (new Date(event.quando).getTime() - Date.now()) / 3_600_000;
    return eventFilter === 'today' ? hours >= 0 && hours <= 24 : hours >= 0 && hours <= 24 * 7;
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.back}><BrandIcon name="arrow-left" size={24} color={c.text} /></PressableScale>
          <View style={styles.headerText}><ThemedText type="label">{city.label.toUpperCase()}</ThemedText><ThemedText type="title">COMMUNITY</ThemedText></View>
        </View>
        <View style={styles.tabs}>
          <Chip label="Incontri" active={section === 'events'} onPress={() => setSection('events')} />
          <Chip label="Bacheca" active={section === 'board'} onPress={() => setSection('board')} />
        </View>
        {loading ? (
          <View style={styles.loading}><SkeletonCard /><SkeletonCard /></View>
        ) : section === 'events' ? (
          <View style={styles.flex}>
            <View style={styles.eventFilters}><Chip label="Oggi" active={eventFilter === 'today'} onPress={() => setEventFilter('today')} /><Chip label="Settimana" active={eventFilter === 'week'} onPress={() => setEventFilter('week')} /><Chip label="Partecipo" active={eventFilter === 'joined'} onPress={() => setEventFilter('joined')} /></View>
            <FlatList
              data={visibleEvents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshing={refreshing}
              onRefresh={() => load(true)}
              renderItem={({ item }) => (
                <Card onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } } as never)} style={styles.eventCard}>
                  {/* La locandina al posto dell'icona quando c'e': si capisce
                      in un secondo di che serata si tratta. */}
                  {item.locandinaUrl ? (
                    <Image source={{ uri: item.locandinaUrl }} style={styles.eventLocandina} contentFit="cover" />
                  ) : (
                    <View style={[styles.eventIcon, { backgroundColor: c.accentSoft }]}><BrandIcon name="cheers" size={26} color={c.accent} /></View>
                  )}
                  <View style={styles.flex}>
                    <ThemedText type="caption" style={{ color: c.accent }}>
                      {item.tipo === 'evento' ? 'EVENTO' : 'INCONTRO'}
                    </ThemedText>
                    <ThemedText type="subtitle">{item.titolo}</ThemedText>
                    <ThemedText type="caption">{formatShortDate(item.quando)}{item.luogo ? ` · ${item.luogo}` : ''}</ThemedText>
                    <ThemedText type="caption">{item.partecipanti ?? 0} su {item.posti} partecipanti</ThemedText>
                  </View>
                  <BrandIcon name="arrow-right" size={20} color={c.textSecondary} />
                </Card>
              )}
              ListEmptyComponent={error ? <EmptyState icon="x-mark" title="Incontri non caricati" message="Controlla la connessione e tira giù per riprovare." /> : <EmptyState icon="cheers" title="Nessun incontro" message="Proponi un posto e un’ora. Il resto lo fa la città." />}
            />
            <PressableScale onPress={() => router.push('/event/new' as never)} style={[styles.fab, { backgroundColor: c.accent }]}>
              <BrandIcon name="plus" size={20} color={c.accentText} /><ThemedText style={[styles.fabLabel, { color: c.accentText }]}>NUOVO INCONTRO</ThemedText>
            </PressableScale>
          </View>
        ) : (
          <FlatList
            data={feed}
            keyExtractor={(item, index) => `${item.tipo}-${item.data}-${index}`}
            contentContainerStyle={styles.list}
            refreshing={refreshing}
            onRefresh={() => load(true)}
            renderItem={({ item }) => (
              <View style={styles.feedRow}>
                <View style={[styles.feedIcon, { backgroundColor: c.surfaceAlt }]}><BrandIcon name={iconFor(item.tipo)} size={22} color={c.accent} /></View>
                <View style={styles.flex}><ThemedText type="defaultSemiBold">{item.userNome}</ThemedText><ThemedText style={{ color: c.textSecondary }}>{item.titolo}</ThemedText><ThemedText type="caption">{formatShortDate(item.data)}</ThemedText></View>
              </View>
            )}
            ListEmptyComponent={error ? <EmptyState icon="x-mark" title="Bacheca non caricata" message="Controlla la connessione e tira giù per riprovare." /> : <EmptyState icon="bell" title="Bacheca silenziosa" message="Quando la città si muove, lo vedrai qui." />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1 }, flex: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm }, loading: { padding: Spacing.md, gap: Spacing.md }, list: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md }, eventCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, eventIcon: { width: 48, height: 48, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' }, eventLocandina: { width: 54, height: 72, borderRadius: Radii.sm },
  eventFilters: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.md, minHeight: 50, borderRadius: Radii.md, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, fabLabel: { fontFamily: Fonts.display, fontSize: 18, letterSpacing: 1 },
  feedRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }, feedIcon: { width: 42, height: 42, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
});
