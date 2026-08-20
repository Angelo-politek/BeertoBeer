import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getConnections, type Connection } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';

/** Le persone conosciute con gli scambi: da qui si apre la chat diretta. */
export default function ConnectionsScreen() {
  const c = useColors();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setConnections(await getConnections());
      setError(null);
    } catch {
      setError('Impossibile caricare le connessioni. Riprova.');
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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Le mie connessioni' }} />
      {loading ? (
        <View style={styles.skeletons}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState icon="x-mark" title="Connessioni non disponibili" message={error} />
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          renderItem={({ item, index }) => (
            <Card
              index={index}
              onPress={() =>
                router.push({ pathname: '/chat/direct/[userId]', params: { userId: item.user.id } } as never)
              }
              style={styles.card}>
              <Avatar name={item.user.nome} uri={item.user.fotoUrl} size={48} />
              <View style={styles.info}>
                <ThemedText type="defaultSemiBold">{item.user.nome}</ThemedText>
                <ThemedText type="caption">
                  {item.scambi} {item.scambi === 1 ? 'scambio' : 'scambi'} · ultimo{' '}
                  {formatShortDate(item.ultimoScambio)}
                </ThemedText>
              </View>
              <View style={[styles.chatBubble, { backgroundColor: c.accentSoft }]}>
                <ThemedText style={{ fontSize: 13 }}>CHAT</ThemedText>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Nessuna connessione (ancora!)"
              message="Completa uno scambio: chi incontri resta qui e potete continuare a scrivervi."
            />
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: { flex: 1, gap: 2 },
  chatBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
