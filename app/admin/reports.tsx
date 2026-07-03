import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteAdminReport, getAdminReports, type AdminReport } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';

export default function AdminReportsScreen() {
  const c = useColors();
  const router = useRouter();
  const mountedRef = useRef(true);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReports(asRefresh = false) {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await getAdminReports();
      if (!mountedRef.current) return;
      setReports(rows);
      setError(null);
    } catch {
      if (!mountedRef.current) return;
      setError('Report non disponibili o permessi insufficienti.');
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadReports();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleDismiss(reportId: string) {
    try {
      await deleteAdminReport(reportId);
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch {
      Alert.alert('Impossibile archiviare', 'Controlla i permessi admin o riprova tra poco.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Moderazione' }} />
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
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadReports(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={[styles.summary, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ThemedText type="defaultSemiBold">Segnalazioni aperte</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>{reports.length} report da verificare</ThemedText>
            </View>
          }
          ListEmptyComponent={<EmptyState title="Nessun report" message="Le segnalazioni compariranno qui." />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ThemedText type="defaultSemiBold">{item.reportedUser?.nome ?? 'Utente segnalato'}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                Da {item.reportingUser?.nome ?? 'utente'} · {formatShortDate(item.createdAt)}
              </ThemedText>
              <ThemedText>{item.motivo}</ThemedText>
              {item.orderId ? <ThemedText style={{ color: c.textSecondary }}>Ordine: {item.orderId}</ThemedText> : null}
              <View style={styles.actions}>
                <Button
                  label="Apri profilo"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.reportedUserId } })}
                  style={styles.actionButton}
                />
                <Button
                  label="Archivia"
                  variant="danger"
                  onPress={() => void handleDismiss(item.id)}
                  style={styles.actionButton}
                />
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
  summary: { borderWidth: 1, borderRadius: 12, padding: Spacing.md, gap: Spacing.xs },
  card: { borderWidth: 1, borderRadius: 12, padding: Spacing.md, gap: Spacing.xs },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionButton: { flex: 1 },
});
