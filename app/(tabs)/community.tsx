import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { LevelBadge } from '@/components/level-badge';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { GLOSSARY } from '@/constants/branding';
import { Radii, Spacing } from '@/constants/theme';
import {
  getCommunityFeed,
  getConnections,
  getEvents,
  getLeaderboard,
  getPeopleInCity,
  type Connection,
} from '@/data/api';
import { useColors, useShadows } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import { useCity } from '@/lib/city-context';
import type { BeerEvent, CommunityFeedItem, LeaderboardEntry, User } from '@/types';

type Tab = 'persone' | 'classifica' | 'giri' | 'bacheca';

const TABS: { key: Tab; label: string }[] = [
  { key: 'persone', label: '👥 Persone' },
  { key: 'classifica', label: '🏆 Classifica' },
  { key: 'giri', label: '🍻 Giri' },
  { key: 'bacheca', label: '📣 Bacheca' },
];

/** Hub della community locale: connessioni, gente in città, classifica, eventi, bacheca. */
export default function CommunityScreen() {
  const { city } = useCity();
  const [tab, setTab] = useState<Tab>('persone');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
          <View style={{ gap: 2 }}>
            <ThemedText type="label">La gente di {city.label} 🤝</ThemedText>
            <ThemedText type="title">Community</ThemedText>
          </View>
        </Animated.View>

        {/* Selettore sezioni */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segments}>
            {TABS.map((t) => (
              <Chip key={t.key} label={t.label} active={t.key === tab} onPress={() => setTab(t.key)} />
            ))}
          </ScrollView>
        </Animated.View>

        {tab === 'persone' && <PeopleTab cityKey={city.key} />}
        {tab === 'classifica' && <LeaderboardTab cityKey={city.key} cityLabel={city.label} />}
        {tab === 'giri' && <EventsTab cityKey={city.key} />}
        {tab === 'bacheca' && <BachecaTab cityKey={city.key} />}
      </SafeAreaView>
    </ThemedView>
  );
}

// ---------- Persone: connessioni + gente in città ----------

function PeopleTab({ cityKey }: { cityKey: string }) {
  const c = useColors();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [conns, ppl] = await Promise.all([getConnections(), getPeopleInCity(cityKey)]);
        setConnections(conns);
        // Escludi dalla scoperta chi è già una connessione.
        const connIds = new Set(conns.map((x) => x.user.id));
        setPeople(ppl.filter((u) => !connIds.has(u.id)));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cityKey],
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingList />;

  return (
    <FlatList
      data={people}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      ListHeaderComponent={
        <View style={styles.section}>
          <ThemedText type="label">Le tue connessioni</ThemedText>
          {connections.length === 0 ? (
            <ThemedText style={{ color: c.textSecondary, fontSize: 15 }}>
              Completa un giro: chi conosci resta qui e potete continuare a scrivervi.
            </ThemedText>
          ) : (
            connections.map((item, i) => (
              <Card
                key={item.user.id}
                index={i}
                onPress={() =>
                  router.push({ pathname: '/chat/direct/[userId]', params: { userId: item.user.id } } as never)
                }
                style={styles.personCard}>
                <Avatar name={item.user.nome} uri={item.user.fotoUrl} size={46} />
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <ThemedText type="defaultSemiBold">{item.user.nome}</ThemedText>
                    <LevelBadge level={item.user.livello ?? 0} />
                  </View>
                  <ThemedText type="caption">
                    {item.scambi} {item.scambi === 1 ? 'giro' : 'giri'} insieme · {formatShortDate(item.ultimoScambio)}
                  </ThemedText>
                </View>
                <View style={[styles.chatBubble, { backgroundColor: c.accentSoft }]}>
                  <ThemedText style={{ fontSize: 15 }}>💬</ThemedText>
                </View>
              </Card>
            ))
          )}
          <ThemedText type="label" style={{ marginTop: Spacing.md }}>
            Gente nella tua zona
          </ThemedText>
        </View>
      }
      renderItem={({ item, index }) => (
        <Card
          index={index}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } } as never)}
          style={styles.personCard}>
          <Avatar name={item.nome} uri={item.fotoUrl} size={46} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold">{item.nome}</ThemedText>
              <LevelBadge level={item.livello ?? 0} />
            </View>
            <ThemedText type="caption" numberOfLines={1}>
              {item.cercoCompagnia ? '🍺 Cerca compagnia · ' : ''}
              {item.preferenzeBirra || `${item.scambiCompletati} giri`}
            </ThemedText>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <EmptyState
          emoji="🏘️"
          title="Ancora nessuno qui intorno"
          message="Invita gli amici della tua zona: la community cresce con te."
        />
      }
    />
  );
}

// ---------- Classifica ----------

function LeaderboardTab({ cityKey, cityLabel }: { cityKey: string; cityLabel: string }) {
  const c = useColors();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setEntries(await getLeaderboard(cityKey));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cityKey],
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingList />;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      ListHeaderComponent={
        <ThemedText style={{ color: c.textSecondary, marginBottom: Spacing.sm, fontSize: 15 }}>
          I più attivi a {cityLabel}. Consegna birre per scalare la classifica.
        </ThemedText>
      }
      renderItem={({ item, index }) => (
        <Card index={index} style={styles.personCard}>
          <ThemedText style={styles.rank}>{medals[index] ?? `${index + 1}`}</ThemedText>
          <Avatar name={item.nome} uri={item.fotoUrl} size={42} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold">{item.nome}</ThemedText>
              <LevelBadge level={item.livello} />
            </View>
          </View>
          <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
            {item.consegne} 🍺
          </ThemedText>
        </Card>
      )}
      ListEmptyComponent={
        <EmptyState
          emoji="🏆"
          title="Classifica vuota"
          message="Nessuna consegna in questa città… per ora. Fai il primo giro!"
        />
      }
    />
  );
}

// ---------- Eventi (giri di birra) ----------

function EventsTab({ cityKey }: { cityKey: string }) {
  const c = useColors();
  const sh = useShadows();
  const router = useRouter();
  const [events, setEvents] = useState<BeerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setEvents(await getEvents(cityKey));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cityKey],
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingList />;

  return (
    <View style={styles.flex}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 96 }]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        renderItem={({ item, index }) => (
          <Card
            index={index}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } } as never)}>
            <ThemedText type="subtitle">🍻 {item.titolo}</ThemedText>
            {item.luogo ? (
              <ThemedText style={{ color: c.textSecondary, marginTop: 4 }}>📍 {item.luogo}</ThemedText>
            ) : null}
            <ThemedText style={{ color: c.textSecondary, marginTop: 2 }}>
              🗓 {formatShortDate(item.quando)} · {item.partecipanti ?? 0}/{item.posti} partecipanti
            </ThemedText>
            {item.partecipo ? (
              <View style={[styles.attendPill, { backgroundColor: c.positiveSoft }]}>
                <ThemedText style={{ color: c.positive, fontSize: 13, fontWeight: '700' }}>✓ Ci sei!</ThemedText>
              </View>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="📅"
            title="Nessun giro in programma"
            message="Organizzane uno tu: proponi un ritrovo e fai conoscere la zona."
          />
        }
      />
      <View style={styles.fabWrap}>
        <PressableScale
          onPress={() => router.push('/event/new' as never)}
          pressedScale={0.93}
          style={[styles.fab, { backgroundColor: c.accent }, sh.fab]}>
          <ThemedText style={{ color: c.accentText, fontWeight: '800' }}>
            + Organizza un {GLOSSARY.delivery}
          </ThemedText>
        </PressableScale>
      </View>
    </View>
  );
}

// ---------- Bacheca ----------

function BachecaTab({ cityKey }: { cityKey: string }) {
  const c = useColors();
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setItems(await getCommunityFeed(cityKey));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cityKey],
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingList />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item, i) => `${item.tipo}-${item.userId}-${item.data}-${i}`}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      renderItem={({ item, index }) => (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(20).stiffness(180)}
          style={styles.feedRow}>
          <View style={[styles.feedIcon, { backgroundColor: c.surfaceAlt }]}>
            <ThemedText style={styles.feedEmoji}>{item.emoji}</ThemedText>
          </View>
          <View style={styles.info}>
            <ThemedText style={{ fontSize: 15, lineHeight: 21 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                {item.userNome}
              </ThemedText>
              {item.tipo === 'badge' ? ' ha sbloccato ' : item.tipo === 'evento' ? ' organizza ' : ' '}
              <ThemedText style={{ color: c.textSecondary, fontSize: 15 }}>{item.titolo}</ThemedText>
            </ThemedText>
            <ThemedText type="caption" style={{ fontSize: 12 }}>
              {formatShortDate(item.data)}
            </ThemedText>
          </View>
        </Animated.View>
      )}
      ListEmptyComponent={
        <EmptyState emoji="📣" title="Bacheca silenziosa" message="Appena la community si muove, lo vedrai qui." />
      }
    />
  );
}

function LoadingList() {
  return (
    <View style={styles.loadingList}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md + 4,
    paddingTop: Spacing.md,
  },
  segments: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm + 4,
  },
  loadingList: { padding: Spacing.md, gap: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  chatBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: { fontSize: 18, width: 28, textAlign: 'center' },
  attendPill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  fabWrap: { position: 'absolute', right: Spacing.md, bottom: Spacing.md },
  fab: { borderRadius: Radii.pill, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
  },
  feedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedEmoji: { fontSize: 20 },
});
