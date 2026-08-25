import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { TestoModal } from '@/components/testo-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { adminIncontri, annullaIncontro, type AdminIncontro } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { formatShortDate } from '@/lib/format';

/**
 * INCONTRI ED EVENTI, PER CHI MODERA.
 *
 * Il pannello non aveva nessun modo di vederli: un incontro con una locandina
 * fuori posto, o in un indirizzo che non esiste, restava invisibile finché
 * qualcuno non lo segnalava — e le segnalazioni riguardano le persone, non i
 * contenuti, quindi spesso non arrivava nemmeno quella.
 *
 * Chiudere non cancella la riga: chi si era iscritto ha diritto di sapere che
 * è saltato, e una riga cancellata non avvisa nessuno.
 */
export default function AdminIncontriScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [righe, setRighe] = useState<AdminIncontro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [daChiudere, setDaChiudere] = useState<AdminIncontro | null>(null);
  const [chiudendo, setChiudendo] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setRighe(await adminIncontri());
      setErrore(null);
    } catch (e) {
      setErrore(messaggioServer(e, 'Elenco non disponibile o permessi insufficienti.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function chiudi(riga: AdminIncontro, motivo: string) {
    setChiudendo(true);
    try {
      await annullaIncontro(riga.id, motivo);
      setDaChiudere(null);
      toast.show('Annullato. Chi partecipava è stato avvisato.');
      await load(true);
    } catch (e) {
      Alert.alert('Non annullato', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setChiudendo(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Incontri ed eventi' }} />
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
        ) : righe.length === 0 ? (
          <EmptyState
            icon="cheers"
            title="Nessun incontro"
            message="Qui compaiono gli incontri e gli eventi dell’ultimo mese, quelli passati compresi."
            actionLabel="Aggiorna"
            onAction={() => load(true)}
          />
        ) : (
          righe.map((r) => {
            const annullato = r.stato === 'annullato';
            const passato = new Date(r.quando).getTime() < Date.now();
            return (
              <View
                key={r.id}
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: annullato ? c.danger : c.border },
                ]}>
                <View style={styles.riga}>
                  <Badge label={r.tipo === 'evento' ? 'Evento' : 'Incontro'} tone="accent" />
                  {annullato ? <Badge label="Annullato" tone="danger" /> : null}
                  {passato && !annullato ? <Badge label="Passato" tone="neutral" /> : null}
                </View>

                <ThemedText type="subtitle">{r.titolo}</ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>
                  {formatShortDate(r.quando)}
                  {r.luogo ? ` · ${r.luogo}` : ''}
                  {r.citta ? ` · ${r.citta}` : ''}
                </ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>
                  {r.partecipanti} / {r.posti} posti
                </ThemedText>

                <Pressable
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.hostId } })}>
                  <ThemedText style={{ color: c.accent }}>Proposto da {r.hostNome}</ThemedText>
                </Pressable>

                <View style={styles.azioni}>
                  <Button
                    label="Apri"
                    variant="secondary"
                    onPress={() => router.push({ pathname: '/event/[id]', params: { id: r.id } } as never)}
                    style={styles.meta}
                  />
                  {!annullato ? (
                    <Button
                      label="Annulla"
                      variant="danger"
                      onPress={() => setDaChiudere(r)}
                      style={styles.meta}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TestoModal
        visible={daChiudere != null}
        titolo="Perché lo annulli?"
        spiegazione="Il motivo arriva a chi l’ha proposto e a chi si era iscritto, e resta nel registro delle azioni di amministrazione."
        placeholder="Es. il locale indicato non esiste"
        etichettaConferma="Annulla l’incontro"
        minimo={5}
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
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: 6 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  azioni: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  meta: { flex: 1 },
});
