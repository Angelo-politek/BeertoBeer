import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ProvvedimentoModal } from '@/components/provvedimento-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Radii, Spacing } from '@/constants/theme';
import {
  adminChiudiSegnalazione,
  adminProvvedimento,
  adminScongelaGiro,
  adminSetOrderModeration,
  getAdminReports,
  type AdminReport,
  type TipoProvvedimento,
} from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { formatShortDate } from '@/lib/format';

/**
 * IL FASCICOLO, DAL LATO DI CHI DECIDE.
 *
 * Prima questa schermata mostrava una riga di testo e offriva due sole azioni:
 * «Sospendi 48h» e «Archivia» — dove archivia voleva dire CANCELLARE la
 * segnalazione. Di una persona segnalata tre volte non restava traccia di
 * nessuna delle tre.
 *
 * Ora ogni segnalazione porta con se' le due versioni dei fatti, il contesto
 * del giro (che resta leggibile anche se il giro viene cancellato) e una scala
 * di provvedimenti. Le segnalazioni non si cancellano: si chiudono.
 */

const MOTIVI: Record<string, string> = {
  unsafe: 'Non si sente al sicuro',
  person_absent: 'Non trova la persona',
  request_mismatch: 'Il giro non era quello concordato',
  cannot_start: 'Non riesce a partire',
  delay: 'In ritardo',
  comportamento_scorretto: 'Comportamento scorretto',
  ordine_falso: 'Ordine falso',
  molestie: 'Molestie',
  spam: 'Spam',
  sicurezza: 'Sicurezza',
  altro: 'Altro',
};

export default function AdminReportsScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const mountedRef = useRef(true);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [provvedimentoPer, setProvvedimentoPer] = useState<AdminReport | null>(null);

  async function loadReports(asRefresh = false) {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await getAdminReports();
      if (!mountedRef.current) return;
      setReports(rows);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(messaggioServer(e, 'Segnalazioni non disponibili o permessi insufficienti.'));
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

  async function esegui(azione: () => Promise<void>, fatto: string) {
    setInCorso(true);
    try {
      await azione();
      toast.show(fatto);
      await loadReports();
    } catch (e) {
      Alert.alert('Non riuscita', messaggioServer(e, 'Riprova.'));
    } finally {
      setInCorso(false);
    }
  }

  /** Chiudere senza punire serve tanto quanto punire, e va lasciata traccia. */
  function chiudiSenzaProvvedimento(report: AdminReport) {
    Alert.alert(
      'Chiudere senza provvedimento?',
      'La segnalazione resta nella storia di entrambe le persone, con la nota che era infondata o gia risolta.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Chiudi',
          onPress: () =>
            void esegui(
              () => adminChiudiSegnalazione(report.id, 'Verificata, nessun provvedimento.'),
              'Segnalazione chiusa',
            ),
        },
      ],
    );
  }

  function applicaProvvedimento(scelta: { tipo: TipoProvvedimento; giorni?: number; motivo: string }) {
    const report = provvedimentoPer;
    if (!report) return;
    void esegui(async () => {
      await adminProvvedimento({
        reportId: report.id,
        userId: report.reportedUserId,
        tipo: scelta.tipo,
        giorni: scelta.giorni,
        motivo: scelta.motivo,
      });
      setProvvedimentoPer(null);
    }, 'Provvedimento applicato e segnalazione chiusa');
  }

  const aperte = reports.filter((r) => r.stato !== 'chiusa');
  const gravi = aperte.filter((r) => r.gravita === 'alta');

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadReports(true)} tintColor={c.accent} />
          }
          ListHeaderComponent={
            <View style={[styles.summary, { backgroundColor: c.surface, borderColor: gravi.length > 0 ? c.danger : c.border }]}>
              <ThemedText type="defaultSemiBold">
                {aperte.length === 0 ? 'Niente da verificare' : `${aperte.length} da verificare`}
              </ThemedText>
              {gravi.length > 0 ? (
                <ThemedText style={{ color: c.danger }}>
                  {gravi.length === 1
                    ? '1 e grave: qualcuno non si e sentito al sicuro.'
                    : `${gravi.length} sono gravi: qualcuno non si e sentito al sicuro.`}
                </ThemedText>
              ) : (
                <ThemedText style={{ color: c.textSecondary }}>
                  Le segnalazioni chiuse restano qui sotto: servono a capire chi e recidivo.
                </ThemedText>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState title="Nessuna segnalazione" message="Quando qualcuno segnala un problema, compare qui." />
          }
          renderItem={({ item }) => {
            const chiusa = item.stato === 'chiusa';
            const contesto = item.contesto as Record<string, unknown> | null;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: item.gravita === 'alta' && !chiusa ? c.danger : c.border },
                  chiusa ? styles.chiusa : null,
                ]}>
                <View style={styles.intestazione}>
                  <ThemedText type="defaultSemiBold" style={styles.flex}>
                    {item.reportedUser?.nome ?? 'Persona segnalata'}
                  </ThemedText>
                  {item.gravita === 'alta' ? <Badge label="GRAVE" tone="danger" /> : null}
                  <Badge
                    label={chiusa ? 'Chiusa' : item.stato === 'in_esame' ? 'Ha risposto' : 'Aperta'}
                    tone={chiusa ? 'neutral' : 'accent'}
                  />
                </View>

                <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                  Segnalata da {item.reportingUser?.nome ?? 'una persona'} · {formatShortDate(item.createdAt)}
                </ThemedText>

                <ThemedText type="defaultSemiBold">
                  {MOTIVI[item.motivoCodice ?? ''] ?? item.motivo}
                </ThemedText>

                {/* LE DUE VERSIONI. Prima ce n'era una sola, e decidere sulla
                    parola di uno solo e' il modo piu' rapido per sbagliare. */}
                <View style={[styles.versione, { borderLeftColor: c.accent }]}>
                  <ThemedText type="caption">CHI SEGNALA</ThemedText>
                  <ThemedText>
                    {item.dichiarazioneSegnalante?.trim() || 'Non ha aggiunto dettagli.'}
                  </ThemedText>
                </View>
                <View style={[styles.versione, { borderLeftColor: c.textSecondary }]}>
                  <ThemedText type="caption">CHI E STATO SEGNALATO</ThemedText>
                  <ThemedText style={item.dichiarazioneSegnalato ? undefined : { color: c.textSecondary }}>
                    {item.dichiarazioneSegnalato?.trim() ||
                      'Non ha ancora risposto. Le e stato chiesto di scrivere la sua versione.'}
                  </ThemedText>
                </View>

                {contesto ? (
                  <ThemedText style={{ color: c.textSecondary, fontSize: 12 }}>
                    {`Giro ${String(contesto.stato ?? '?')} · ${String(contesto.citta ?? '?')} · ${
                      contesto.crediti ?? '?'
                    } BeerCoin · creato ${
                      contesto.creato_il ? formatShortDate(String(contesto.creato_il)) : '?'
                    }`}
                  </ThemedText>
                ) : null}

                {item.noteAdmin ? (
                  <ThemedText style={{ color: c.textSecondary, fontSize: 12 }}>Nota: {item.noteAdmin}</ThemedText>
                ) : null}

                {!chiusa ? (
                  <>
                    <View style={styles.actions}>
                      <Button
                        label="Chi segnala"
                        variant="secondary"
                        size="md"
                        onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.reportingUserId } })}
                        style={styles.actionButton}
                      />
                      <Button
                        label="Chi e segnalato"
                        variant="secondary"
                        size="md"
                        onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.reportedUserId } })}
                        style={styles.actionButton}
                      />
                    </View>

                    {item.orderId ? (
                      <View style={styles.actions}>
                        <Button
                          label="Apri il giro"
                          variant="secondary"
                          size="md"
                          onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.orderId as string } })}
                          style={styles.actionButton}
                        />
                        <Button
                          label="Sblocca il giro"
                          variant="secondary"
                          size="md"
                          onPress={() =>
                            void esegui(
                              () => adminScongelaGiro(item.orderId as string, `Verificata segnalazione ${item.id}`),
                              'Giro rimesso in moto',
                            )
                          }
                          style={styles.actionButton}
                        />
                      </View>
                    ) : null}

                    <View style={styles.actions}>
                      <Button
                        label="Chiudi senza punire"
                        variant="secondary"
                        size="md"
                        onPress={() => chiudiSenzaProvvedimento(item)}
                        style={styles.actionButton}
                      />
                      <Button
                        label="Provvedimento"
                        variant="danger"
                        size="md"
                        onPress={() => setProvvedimentoPer(item)}
                        style={styles.actionButton}
                      />
                    </View>

                    {item.orderId ? (
                      <Button
                        label="Togli il giro dal feed"
                        variant="secondary"
                        size="md"
                        onPress={() =>
                          void esegui(
                            () => adminSetOrderModeration(item.orderId as string, 'rimosso'),
                            'Giro nascosto dal feed',
                          )
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <ProvvedimentoModal
        visible={provvedimentoPer != null}
        nomePersona={provvedimentoPer?.reportedUser?.nome ?? 'questa persona'}
        loading={inCorso}
        onClose={() => setProvvedimentoPer(null)}
        onSubmit={applicaProvvedimento}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.sm },
  summary: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.xs },
  card: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.xs },
  chiusa: { opacity: 0.55 },
  intestazione: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  versione: { borderLeftWidth: 3, paddingLeft: Spacing.sm, gap: 2, marginTop: Spacing.xs },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionButton: { flex: 1 },
});
