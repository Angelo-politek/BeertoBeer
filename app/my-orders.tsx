import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getMyOrders } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { STATO_LABEL } from '@/lib/orders';
import type { BeerRequest } from '@/types';

export default function MyOrdersScreen() {
  const c = useColors();
  const router = useRouter();
  const { session } = useSession();
  const myId = session?.user.id;

  const [orders, setOrders] = useState<BeerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getMyOrders()
        .then((o) => {
          if (!active) return;
          setOrders(o);
          setError(null);
        })
        .catch(() => {
          if (active) setError('Impossibile caricare i tuoi ordini. Riprova.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
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
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isHost = item.host.id === myId;
            const birreLabel = item.birre.map((b) => `${b.quantita}× ${b.nome}`).join(' · ');
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
                  <Badge label={STATO_LABEL[item.stato]} tone="accent" />
                </View>
                <ThemedText style={{ color: c.textSecondary }}>{birreLabel}</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
                  {item.creditiOfferti} crediti
                </ThemedText>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText type="defaultSemiBold">Nessun ordine</ThemedText>
              <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>
                Le richieste che crei e le consegne che accetti compariranno qui.
              </ThemedText>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  empty: { alignItems: 'center', gap: Spacing.xs, paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  list: { padding: Spacing.md, gap: Spacing.sm },
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
