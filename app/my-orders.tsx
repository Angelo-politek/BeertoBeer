import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger }}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.filters}>
              <Pressable
                onPress={() => setShowCompleted(false)}
                style={[styles.filter, { borderColor: !showCompleted ? c.accent : c.border, backgroundColor: !showCompleted ? c.accentSoft : c.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: !showCompleted ? c.accent : c.text }}>
                  Attivi
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowCompleted(true)}
                style={[styles.filter, { borderColor: showCompleted ? c.accent : c.border, backgroundColor: showCompleted ? c.accentSoft : c.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: showCompleted ? c.accent : c.text }}>
                  Completati
                </ThemedText>
              </Pressable>
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
              <Pressable
                onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <View style={styles.cardHeader}>
                  <ThemedText type="defaultSemiBold">
                    {isHost ? 'La tua richiesta' : `Consegna per ${item.host.nome}`}
                  </ThemedText>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>
                <ThemedText style={{ color: c.textSecondary }}>{birreLabel}</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
                  {item.creditiOfferti} crediti
                </ThemedText>
              </Pressable>
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
  list: { padding: Spacing.md, gap: Spacing.sm },
  filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
