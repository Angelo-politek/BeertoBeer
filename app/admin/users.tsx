import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { adminAdjustCredits, adminDeleteUser, adminListUsers, adminSuspendUser, type AdminUser } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import { getCity } from '@/lib/cities';

/** Pannello admin: tutti gli utenti registrati, con sospensione ed eliminazione. */
export default function AdminUsersScreen() {
  const c = useColors();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [creditTarget, setCreditTarget] = useState<AdminUser | null>(null);
  const [creditDelta, setCreditDelta] = useState('');
  const [creditMotivo, setCreditMotivo] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setUsers(await adminListUsers());
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  function isSuspended(u: AdminUser): boolean {
    return u.sospesoFino != null && new Date(u.sospesoFino).getTime() > Date.now();
  }

  function handleSuspend(user: AdminUser) {
    const suspended = isSuspended(user);
    Alert.alert(
      suspended ? 'Riattivare l’utente?' : 'Sospendere l’utente?',
      suspended
        ? `${user.nome} potrà di nuovo creare richieste.`
        : `${user.nome} non potrà creare nuove richieste per 48 ore.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: suspended ? 'Riattiva' : 'Sospendi 48h',
          style: suspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await adminSuspendUser(
                user.id,
                suspended ? null : new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
              );
              toast.show(suspended ? 'Utente riattivato' : 'Utente sospeso per 48 ore');
              load(true);
            } catch (e) {
              Alert.alert('Operazione non riuscita', (e as { message?: string })?.message ?? 'Riprova.');
            }
          },
        },
      ],
    );
  }

  async function handleAdjustCredits() {
    if (!creditTarget) return;
    const delta = Number(creditDelta);
    if (!Number.isInteger(delta) || delta === 0) {
      Alert.alert('Valore non valido', 'Inserisci un numero intero diverso da zero (es. 5 o -3).');
      return;
    }
    setCreditLoading(true);
    try {
      await adminAdjustCredits(creditTarget.id, delta, creditMotivo.trim() || undefined);
      toast.show(
        delta > 0
          ? `+${delta} crediti a ${creditTarget.nome}`
          : `${delta} crediti a ${creditTarget.nome}`,
      );
      setCreditTarget(null);
      setCreditDelta('');
      setCreditMotivo('');
      load(true);
    } catch (e) {
      Alert.alert('Operazione non riuscita', (e as { message?: string })?.message ?? 'Riprova.');
    } finally {
      setCreditLoading(false);
    }
  }

  function handleDelete(user: AdminUser) {
    Alert.alert(
      'Eliminare definitivamente l’account?',
      `${user.nome} (${user.email}) e tutti i suoi dati (richieste, chat, recensioni) verranno cancellati. L'operazione è irreversibile e viene rifiutata se ha consegne in corso.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina account',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteUser(user.id);
              toast.show('Account eliminato');
              load(true);
            } catch (e) {
              Alert.alert('Eliminazione rifiutata', (e as { message?: string })?.message ?? 'Riprova.');
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Utenti' }} />
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
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cerca per nome o email"
                placeholderTextColor={c.textSecondary}
                autoCapitalize="none"
                style={[styles.search, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {users.length} utenti registrati
              </ThemedText>
            </View>
          }
          ListEmptyComponent={<EmptyState title="Nessun utente" message="Nessun risultato per questa ricerca." />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold">{item.nome}</ThemedText>
                {item.isAdmin ? <Badge label="Admin" tone="accent" /> : null}
                {isSuspended(item) ? <Badge label="Sospeso" tone="danger" /> : null}
              </View>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>{item.email}</ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {item.citta ? `${getCity(item.citta).label} · ` : ''}
                {item.creditiSaldo} crediti · {item.nRichieste} richieste · {item.nConsegne} consegne · ⭐{' '}
                {item.ratingMedio.toFixed(1)}
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                Registrato il {formatShortDate(item.createdAt)}
                {isSuspended(item)
                  ? ` · sospeso fino al ${new Date(item.sospesoFino as string).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </ThemedText>
              <View style={styles.actions}>
                <Button
                  label="Crediti ±"
                  variant="secondary"
                  onPress={() => setCreditTarget(item)}
                  style={styles.actionButton}
                />
                {!item.isAdmin ? (
                  <>
                    <Button
                      label={isSuspended(item) ? 'Riattiva' : 'Sospendi 48h'}
                      variant="secondary"
                      onPress={() => handleSuspend(item)}
                      style={styles.actionButton}
                    />
                    <Button
                      label="Elimina"
                      variant="danger"
                      onPress={() => handleDelete(item)}
                      style={styles.actionButton}
                    />
                  </>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      {/* Rettifica crediti (tracciata nel ledger con tipo 'admin') */}
      <Modal visible={creditTarget != null} transparent animationType="fade" onRequestClose={() => setCreditTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setCreditTarget(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]}>
            <ThemedText type="subtitle">Crediti di {creditTarget?.nome}</ThemedText>
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              Saldo attuale: {creditTarget?.creditiSaldo} crediti. Inserisci la variazione (positiva per
              accreditare, negativa per togliere). Il movimento finisce nel ledger.
            </ThemedText>
            <TextInput
              value={creditDelta}
              onChangeText={(t) => setCreditDelta(t.replace(/[^0-9-]/g, ''))}
              placeholder="Es. 5 oppure -3"
              placeholderTextColor={c.textSecondary}
              keyboardType="numbers-and-punctuation"
              style={[styles.search, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />
            <TextInput
              value={creditMotivo}
              onChangeText={setCreditMotivo}
              placeholder="Motivo (facoltativo, es. bonus evento)"
              placeholderTextColor={c.textSecondary}
              style={[styles.search, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />
            <View style={styles.actions}>
              <Button
                label="Annulla"
                variant="secondary"
                onPress={() => setCreditTarget(null)}
                disabled={creditLoading}
                style={styles.actionButton}
              />
              <Button
                label="Applica"
                onPress={() => void handleAdjustCredits()}
                loading={creditLoading}
                style={styles.actionButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.sm },
  header: { gap: Spacing.xs, marginBottom: Spacing.xs },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    height: 44,
  },
  card: { borderWidth: 1, borderRadius: 12, padding: Spacing.md, gap: Spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionButton: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
