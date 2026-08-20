import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { adminListShops, adminSetShopStato, type Shop } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { getCity } from '@/lib/cities';

/** Moderazione negozi community: approvazione delle proposte e rimozioni. */
export default function AdminShopsScreen() {
  const c = useColors();
  const toast = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setShops(await adminListShops());
      setError(null);
    } catch {
      setError('Lista non disponibile o permessi insufficienti.');
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

  async function handleSetStato(shop: Shop, stato: 'approvato' | 'rimosso') {
    try {
      await adminSetShopStato(shop.id, stato);
      toast.show(stato === 'approvato' ? 'Negozio approvato e pubblicato' : 'Negozio rimosso dalla mappa');
      load(true);
    } catch (e) {
      Alert.alert('Operazione non riuscita', (e as { message?: string })?.message ?? 'Riprova.');
    }
  }

  // In attesa prima, poi approvati, poi rimossi.
  const ordered = [...shops].sort((a, b) => {
    const rank = (s: Shop) => (s.stato === 'in_attesa' ? 0 : s.stato === 'approvato' ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Negozi' }} />
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
          data={ordered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListEmptyComponent={
            <EmptyState title="Nessun negozio" message="Le proposte della community compariranno qui." />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                  {item.nome}
                </ThemedText>
                <Badge
                  label={item.stato === 'in_attesa' ? 'In attesa' : item.stato === 'approvato' ? 'Pubblicato' : 'Rimosso'}
                  tone={item.stato === 'in_attesa' ? 'danger' : item.stato === 'approvato' ? 'accent' : 'neutral'}
                />
              </View>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {getCity(item.citta).label}
                {item.orari ? ` · orari: ${item.orari}` : ' · orari non segnalati'}
              </ThemedText>
              <View style={styles.actions}>
                <Button
                  label="Verifica sulla mappa"
                  variant="secondary"
                  onPress={() =>
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`).catch(
                      () => null,
                    )
                  }
                  style={styles.actionButton}
                />
              </View>
              <View style={styles.actions}>
                {item.stato !== 'approvato' ? (
                  <Button
                    label="✓ Approva"
                    onPress={() => void handleSetStato(item, 'approvato')}
                    style={styles.actionButton}
                  />
                ) : null}
                {item.stato !== 'rimosso' ? (
                  <Button
                    label="Rimuovi"
                    variant="danger"
                    onPress={() => void handleSetStato(item, 'rimosso')}
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: { borderWidth: 1, borderRadius: 12, padding: Spacing.md, gap: Spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionButton: { flex: 1 },
});
