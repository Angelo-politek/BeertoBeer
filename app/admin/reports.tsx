import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import {
  adminSetOrderModeration,
  adminSuspendUser,
  deleteAdminReport,
  getAdminReports,
  type AdminReport,
} from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';

export default function AdminReportsScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
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

  /** Approva la richiesta segnalata: torna nel feed, sospensione azzerata. */
  async function handleApproveOrder(report: AdminReport) {
    if (!report.orderId) return;
    try {
      await adminSetOrderModeration(report.orderId, 'ok');
      await deleteAdminReport(report.id);
      setReports((current) => current.filter((r) => r.id !== report.id));
      toast.show('Richiesta approvata e ripubblicata');
    } catch {
      Alert.alert('Operazione non riuscita', 'Controlla i permessi admin o riprova.');
    }
  }

  /** Rimuove definitivamente la richiesta segnalata. */
  function handleRemoveOrder(report: AdminReport) {
    if (!report.orderId) return;
    Alert.alert('Rimuovere la richiesta?', 'La richiesta resterà nascosta dal feed in modo definitivo.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminSetOrderModeration(report.orderId as string, 'rimosso');
            await deleteAdminReport(report.id);
            setReports((current) => current.filter((r) => r.id !== report.id));
            toast.show('Richiesta rimossa');
          } catch {
            Alert.alert('Operazione non riuscita', 'Controlla i permessi admin o riprova.');
          }
        },
      },
    ]);
  }

  /** Sospende l'utente segnalato per 48 ore (segnalazioni account). */
  function handleSuspendUser(report: AdminReport) {
    Alert.alert('Sospendere l’utente?', 'Non potrà creare nuove richieste per 48 ore.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Sospendi 48h',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminSuspendUser(report.reportedUserId, new Date(Date.now() + 48 * 3600 * 1000).toISOString());
            toast.show('Utente sospeso per 48 ore');
          } catch (e) {
            Alert.alert('Operazione non riuscita', (e as { message?: string })?.message ?? 'Riprova.');
          }
        },
      },
    ]);
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
              {item.orderId ? (
                <>
                  <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                    Segnalazione di una RICHIESTA (oscurata in attesa di verifica)
                  </ThemedText>
                  <View style={styles.actions}>
                    <Button
                      label="Apri richiesta"
                      variant="secondary"
                      onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.orderId as string } })}
                      style={styles.actionButton}
                    />
                    <Button
                      label="Apri profilo"
                      variant="secondary"
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.reportedUserId } })}
                      style={styles.actionButton}
                    />
                  </View>
                  <View style={styles.actions}>
                    <Button
                      label="✓ Approva"
                      onPress={() => void handleApproveOrder(item)}
                      style={styles.actionButton}
                    />
                    <Button
                      label="Rimuovi"
                      variant="danger"
                      onPress={() => handleRemoveOrder(item)}
                      style={styles.actionButton}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.actions}>
                  <Button
                    label="Apri profilo"
                    variant="secondary"
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.reportedUserId } })}
                    style={styles.actionButton}
                  />
                  <Button
                    label="Sospendi 48h"
                    variant="danger"
                    onPress={() => handleSuspendUser(item)}
                    style={styles.actionButton}
                  />
                  <Button
                    label="Archivia"
                    variant="secondary"
                    onPress={() => void handleDismiss(item.id)}
                    style={styles.actionButton}
                  />
                </View>
              )}
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
