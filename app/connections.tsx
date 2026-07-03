import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
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
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger }}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/chat/direct/[userId]', params: { userId: item.user.id } } as never)
              }
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Avatar name={item.user.nome} uri={item.user.fotoUrl} size={48} />
              <View style={styles.info}>
                <ThemedText type="defaultSemiBold">{item.user.nome}</ThemedText>
                <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                  {item.scambi} {item.scambi === 1 ? 'scambio' : 'scambi'} · ultimo{' '}
                  {formatShortDate(item.ultimoScambio)}
                </ThemedText>
              </View>
              <ThemedText style={{ color: c.accent }}>💬</ThemedText>
            </Pressable>
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
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
  },
  info: { flex: 1, gap: 2 },
});
