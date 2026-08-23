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
import { getMyOrders, getReviewedOrderIds } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { nextOrderAction } from '@/lib/discovery';
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
  const [section, setSection] = useState<'todo' | 'progress' | 'waiting' | 'done'>('todo');
  const [error, setError] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [rows, reviewed] = await Promise.all([
        getMyOrders(),
        // Best-effort: se non arriva, al massimo riproponiamo una recensione
        // già lasciata — meglio che non proporla mai.
        getReviewedOrderIds().catch(() => [] as string[]),
      ]);
      setOrders(rows);
      setReviewedIds(new Set(reviewed));
      setError(null);
    } catch {
      setError('Impossibile caricare i tuoi giri. Riprova.');
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

  /**
   * Un giro chiuso è chiuso e basta: prima "annullato" e "scaduto" finivano sia
   * fra i conclusi sia fra quelli in attesa, perché la sezione "in attesa"
   * escludeva solo lo stato 'confermato'. Un unico criterio evita il doppione.
   */
  const isClosed = (order: BeerRequest) =>
    ['confermato', 'annullato'].includes(order.stato) || isExpired(order);

  const visibleOrders = orders.filter((order) => {
    const action = nextOrderAction(order, myId);
    if (section === 'done') return isClosed(order);

    // Un giro concluso ma non ancora recensito resta fra le cose da fare: la
    // recensione è l'ultimo passo dello scambio, non un extra facoltativo.
    // Sparisce da sola appena la recensione esiste.
    const daRecensire =
      order.stato === 'confermato' && action.key === 'review' && !reviewedIds.has(order.id);
    if (section === 'todo') {
      return daRecensire || (!isClosed(order) && ['accept', 'start', 'arrive', 'verify', 'confirm'].includes(action.key));
    }

    if (isClosed(order)) return false;
    if (section === 'progress') return ['accettato', 'in_consegna', 'arrivato'].includes(order.stato);
    return ['wait', 'open'].includes(action.key);
  }).sort((a, b) => nextOrderAction(b, myId).priority - nextOrderAction(a, myId).priority);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'I miei giri' }} />
      {loading ? (
        <View style={styles.skeletons}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState icon="x-mark" title="Giri non disponibili" message={error} />
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.filters}>
              <Chip label="Da fare" active={section === 'todo'} onPress={() => setSection('todo')} />
              <Chip label="In corso" active={section === 'progress'} onPress={() => setSection('progress')} />
              <Chip label="In attesa" active={section === 'waiting'} onPress={() => setSection('waiting')} />
              <Chip label="Conclusi" active={section === 'done'} onPress={() => setSection('done')} />
            </View>
          }
          renderItem={({ item }) => {
            const isHost = item.host.id === myId;
            const birreLabel = item.birre.map((b) => `${b.quantita} × ${b.nome}`).join(' · ');
            const action = nextOrderAction(item, myId);
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
                    {isHost ? 'Hai chiesto' : `Stai portando a ${item.host.nome}`}
                  </ThemedText>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>
                <ThemedText style={{ color: c.textSecondary }}>{birreLabel}</ThemedText>
                <ThemedText type="defaultSemiBold">{action.label}</ThemedText>
                {item.fascia ? <ThemedText type="caption">{item.fascia}</ThemedText> : null}
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
                  {item.creditiOfferti} BeerCoin
                </ThemedText>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState title="Niente da mostrare" message="I giri compariranno qui in base alla prossima azione." />
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
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
