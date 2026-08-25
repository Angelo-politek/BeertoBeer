import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { TestoModal } from '@/components/testo-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { BrandIcon } from '@/components/ui/brand-icon';
import { Spacing } from '@/constants/theme';
import { adminCancelOrder, adminGetActiveOrders, type AdminActiveOrder } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { relative } from '@/lib/format';
import { STATO_LABEL } from '@/lib/orders';
import type { OrderStatus } from '@/types';

/**
 * I GIRI IN CORSO, E IL MODO DI CHIUDERLI.
 *
 * Segnalazione del collaudo: «sezione del pannello di amministrazione con
 * tutti i giri attivi, con la possibilità di chiuderli (utile in caso di bug e
 * giri che rimangono visibili per errore)».
 *
 * La parte imbarazzante e' che il pezzo difficile c'era gia' tutto:
 * `admin_active_orders()` alimentava la safety map, e `adminCancelOrder()`
 * stava in data/api.ts da settembre — implementata, esposta, e importata da
 * nessuna schermata. Un amministratore non poteva chiudere un giro nemmeno
 * sapendo che era rotto: poteva solo guardarlo sulla mappa.
 *
 * La mappa resta e serve a un'altra domanda: «dove sono adesso». Questa
 * risponde a «cosa e' fermo da troppo tempo», che e' un elenco, non una mappa.
 */
export default function AdminGiriScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [giri, setGiri] = useState<AdminActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [daChiudere, setDaChiudere] = useState<AdminActiveOrder | null>(null);
  const [chiudendo, setChiudendo] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setGiri(await adminGetActiveOrders());
      setErrore(null);
    } catch (e) {
      setErrore(messaggioServer(e, 'Elenco non disponibile o permessi insufficienti.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function chiudi(giro: AdminActiveOrder, motivo: string) {
    setChiudendo(true);
    try {
      await adminCancelOrder(giro.id, motivo);
      setDaChiudere(null);
      // Le due persone ricevono una notifica dal database: e' la ragione per
      // cui questa azione e' sopportabile. Chiudere un giro in silenzio
      // lascerebbe qualcuno ad aspettare sotto un portone.
      toast.show('Giro chiuso. Le due persone sono state avvisate.');
      await load(true);
    } catch (e) {
      Alert.alert('Non chiuso', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setChiudendo(false);
    }
  }

  /** Da quanto tempo il giro non si muove. Sopra le 6 ore, qualcosa non va. */
  function oreFerme(giro: AdminActiveOrder): number {
    return (Date.now() - new Date(giro.updatedAt).getTime()) / 3_600_000;
  }

  // I piu' fermi in cima: sono quelli per cui questa schermata esiste.
  const ordinati = [...giri].sort((a, b) => oreFerme(b) - oreFerme(a));

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Giri in corso' }} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : errore ? (
          <EmptyState
            icon="x-mark"
            title="Elenco non disponibile"
            message={errore}
            actionLabel="Riprova"
            onAction={() => load(true)}
          />
        ) : ordinati.length === 0 ? (
          <EmptyState
            icon="check"
            title="Nessun giro in corso"
            message="In questo momento non c’è nessuno per strada. Qui compaiono i giri accettati e non ancora chiusi."
            actionLabel="Guarda la mappa"
            onAction={() => router.push('/admin/safety-map' as never)}
          />
        ) : (
          <>
            <ThemedText style={{ color: c.textSecondary }}>
              {ordinati.length} {ordinati.length === 1 ? 'giro in corso' : 'giri in corso'}. I più fermi in cima.
            </ThemedText>

            {ordinati.map((giro) => {
              const ore = oreFerme(giro);
              const bloccato = ore >= 6;
              return (
                <View
                  key={giro.id}
                  style={[styles.card, { backgroundColor: c.surface, borderColor: bloccato ? c.danger : c.border }]}>
                  <View style={styles.riga}>
                    <Badge label={STATO_LABEL[giro.state as OrderStatus] ?? giro.state} tone="accent" />
                    <ThemedText style={{ color: bloccato ? c.danger : c.textSecondary, flex: 1, textAlign: 'right' }}>
                      fermo da {relative(giro.updatedAt)}
                    </ThemedText>
                  </View>

                  <Pressable
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: giro.hostId } })}
                    style={({ pressed }) => [styles.persona, { opacity: pressed ? 0.6 : 1 }]}>
                    <Avatar name={giro.hostName} size={36} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="label" style={{ color: c.textSecondary }}>CHIEDE</ThemedText>
                      <ThemedText>{giro.hostName}</ThemedText>
                    </View>
                    <BrandIcon name="arrow-right" size={18} color={c.textSecondary} />
                  </Pressable>

                  {giro.driverId ? (
                    <Pressable
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: giro.driverId as string } })}
                      style={({ pressed }) => [styles.persona, { opacity: pressed ? 0.6 : 1 }]}>
                      <Avatar name={giro.driverName ?? 'Qualcuno'} size={36} uri={giro.driverPhoto} />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="label" style={{ color: c.textSecondary }}>PORTA</ThemedText>
                        <ThemedText>{giro.driverName ?? 'Qualcuno'}</ThemedText>
                      </View>
                      <BrandIcon name="arrow-right" size={18} color={c.textSecondary} />
                    </Pressable>
                  ) : null}

                  {giro.lastSeen ? (
                    <ThemedText style={{ color: c.textSecondary }}>
                      Ultima posizione di chi porta: {relative(giro.lastSeen)}
                    </ThemedText>
                  ) : null}

                  <View style={styles.azioni}>
                    <Button
                      label="Apri il giro"
                      variant="secondary"
                      onPress={() => router.push({ pathname: '/request/[id]', params: { id: giro.id } })}
                      style={styles.meta}
                    />
                    <Button
                      label="Chiudi il giro"
                      variant="danger"
                      onPress={() => setDaChiudere(giro)}
                      style={styles.meta}
                    />
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <TestoModal
        visible={daChiudere != null}
        titolo="Perché chiudi questo giro?"
        spiegazione="Il motivo arriva alle due persone insieme alla notifica, e resta scritto nel registro delle azioni di amministrazione."
        placeholder="Es. giro rimasto aperto per un errore dell’app"
        etichettaConferma="Chiudi il giro"
        minimo={10}
        pericolo
        loading={chiudendo}
        onClose={() => setDaChiudere(null)}
        onSubmit={(testo) => {
          if (daChiudere) void chiudi(daChiudere, testo);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: Spacing.sm },
  riga: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  persona: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  azioni: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  meta: { flex: 1 },
});
