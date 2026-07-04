import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getMyOrders } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { isExpired, STATO_LABEL } from '@/lib/orders';
import type { BeerRequest } from '@/types';

export default function MyOrdersScreen() {
  const c = useColors();
  const router = useRouter();
  const { session } = useSession();
  const myId = session?.user.id;

  const [orders, setOrders] = useState<BeerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await getMyOrders();
      setOrders(rows);
      setError(null);
    } catch {
      setError('Impossibile caricare i tuoi ordini. Riprova.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visibleOrders = orders.filter((order) =>
    showCompleted ? order.stato === 'confermato' : order.stato !== 'confermato',
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'I miei ordini' }} />
      {loading ? (
        <View style={styles.skeletons}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState emoji="😵" title="Ops" message={error} />
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.filters}>
              <Chip label="Attivi" active={!showCompleted} onPress={() => setShowCompleted(false)} />
              <Chip label="Completati" active={showCompleted} onPress={() => setShowCompleted(true)} />
            </View>
          }
          renderItem={({ item }) => {
            const isHost = item.host.id === myId;
            const birreLabel = item.birre.map((b) => `${b.quantita}× ${b.nome}`).join(' · ');
            // Stati speciali: moderazione e scadenza vincono sull'etichetta di stato.
            const badge =
              item.statoModerazione === 'rimosso'
                ? { label: 'Rimossa', tone: 'danger' as const }
                : item.statoModerazione === 'oscurato'
                  ? { label: 'In verifica', tone: 'danger' as const }
                  : isExpired(item)
                    ? { label: 'Scaduta', tone: 'neutral' as const }
                    : { label: STATO_LABEL[item.stato], tone: 'accent' as const };
            return (
              <Card onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })} style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="defaultSemiBold">
                    {isHost ? 'La tua richiesta' : `Consegna per ${item.host.nome}`}
                  </ThemedText>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>
                <ThemedText style={{ color: c.textSecondary }}>{birreLabel}</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
                  +{item.creditiOfferti} crediti
                </ThemedText>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState title="Nessun ordine" message="Le richieste che crei e le consegne che accetti compariranno qui." />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  skeletons: { padding: Spacing.md, gap: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.md },
  filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  card: {
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
