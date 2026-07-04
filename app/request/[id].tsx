import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DeliveryMap } from '@/components/delivery-map';
import { ReportModal } from '@/components/report-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { acceptOrder, advanceOrder, cancelOrder, confirmOrder, getRequestById, reportUser } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { CREDIT_CAP, estimateBonus, FORMATS } from '@/lib/credits';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import { STATO_LABEL } from '@/lib/orders';
import type { BeerRequest, ReportReason } from '@/types';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const { session } = useSession();

  const toast = useToast();
  const [request, setRequest] = useState<BeerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [driverCoords, setDriverCoords] = useState<Coords | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('ordine_falso');
  const [reportDetails, setReportDetails] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Posizione dell'utente (per la distanza dalla consegna). Best-effort.
  useEffect(() => {
    let active = true;
    getCurrentCoords().then((coords) => {
      if (active) setDriverCoords(coords);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getRequestById(id)
        .then((r) => {
          if (active) setRequest(r);
        })
        .catch(() => {
          if (active) setRequest(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [id]),
  );

  async function reload() {
    try {
      setRequest(await getRequestById(id));
    } catch {
      // teniamo lo stato corrente in caso di errore di refresh
    }
  }

  function errorMessage(e: unknown): string {
    return (e as { message?: string })?.message ?? 'Operazione non riuscita. Riprova.';
  }

  async function runAction(fn: () => Promise<void>) {
    setActing(true);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    setActing(true);
    setActionError(null);
    try {
      await cancelOrder(id);
      router.back();
    } catch (e) {
      setActionError(errorMessage(e));
      setActing(false);
    }
  }

  async function handleReport() {
    if (!request) return;
    setReportLoading(true);
    try {
      await reportUser(request.host.id, reportReason, reportDetails, request.id);
      setReportOpen(false);
      setReportDetails('');
      toast.show('Segnalazione inviata: la richiesta è in verifica');
    } catch {
      toast.show('Segnalazione non inviata (già segnalata?)', 'error');
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Richiesta' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Richiesta' }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">Richiesta scaduta o non disponibile</ThemedText>
          <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>
            Potrebbe essere già stata accettata, scaduta dopo 12 ore o rimossa. Torna al feed per
            vedere le richieste attive.
          </ThemedText>
          <Button label="Torna al feed" variant="secondary" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  const { host } = request;
  const myId = session?.user.id;
  const isHost = host.id === myId;
  const isDriver = request.driverId != null && request.driverId === myId;
  const canSeeAddress = isHost || isDriver;

  const formatLabel = (key?: string) => FORMATS.find((f) => f.key === key)?.label ?? '';
  const hasCoords = request.lat != null && request.lng != null;
  const distanceKm =
    driverCoords && hasCoords
      ? haversineKm(driverCoords, { lat: request.lat as number, lng: request.lng as number })
      : null;

  function renderFooter() {
    if (!request) return null;
    const stato = request.stato;

    if (stato === 'richiesto') {
      if (isHost) {
        return <Button label="Annulla richiesta" variant="danger" onPress={handleCancel} loading={acting} />;
      }
      return (
        <Button
          label="Accetta consegna"
          onPress={() => runAction(() => acceptOrder(id, driverCoords))}
          loading={acting}
        />
      );
    }

    if (stato === 'accettato') {
      if (isDriver) {
        return (
          <Button
            label="Inizia consegna"
            onPress={() => runAction(() => advanceOrder(id, 'in_consegna'))}
            loading={acting}
          />
        );
      }
      return <StatusNote text="Un driver ha accettato e si sta organizzando." />;
    }

    if (stato === 'in_consegna') {
      if (isDriver) {
        return (
          <Button
            label="Segna come consegnato"
            onPress={() => runAction(() => advanceOrder(id, 'consegnato'))}
            loading={acting}
          />
        );
      }
      return <StatusNote text="Consegna in corso." />;
    }

    if (stato === 'consegnato') {
      const iConfirmed = isHost ? request.hostConfermato : request.driverConfermato;
      if ((isHost || isDriver) && !iConfirmed) {
        return (
          <Button label="Conferma scambio" onPress={() => runAction(() => confirmOrder(id))} loading={acting} />
        );
      }
      return <StatusNote text="In attesa della conferma dell'altra persona." />;
    }

    if (isHost || isDriver) {
      return (
        <View style={styles.footerActions}>
          <Button
            label="Apri chat"
            variant="secondary"
            onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: id } } as never)}
          />
          <Button label="Lascia recensione" onPress={() => router.push({ pathname: '/review', params: { orderId: id } } as never)} />
        </View>
      );
    }

    return <StatusNote text="Scambio completato. Crediti trasferiti." />;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Dettaglio richiesta' }} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stato corrente + segnalazione */}
        <View style={styles.statusRow}>
          <Badge label={STATO_LABEL[request.stato]} tone="accent" />
          {!isHost && request.stato === 'richiesto' ? (
            <Pressable onPress={() => setReportOpen(true)} hitSlop={8}>
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>⚠ Segnala richiesta</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* Profilo host (toccabile → apre il profilo) */}
        <Pressable
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: host.id } })}
          style={({ pressed }) => [styles.hostRow, { opacity: pressed ? 0.6 : 1 }]}>
          <Avatar name={host.nome} size={56} uri={host.fotoUrl} />
          <View style={styles.hostInfo}>
            <ThemedText type="subtitle">{host.nome}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {host.eta} anni · ⭐ {host.ratingMedio.toFixed(1)} · {host.scambiCompletati} scambi
            </ThemedText>
          </View>
          <ThemedText style={{ color: c.textSecondary }}>›</ThemedText>
        </Pressable>
        {host.bio ? (
          <ThemedText style={[styles.bio, { color: c.textSecondary }]}>{host.bio}</ThemedText>
        ) : null}

        {/* Banner vibe mode */}
        {request.vibeMode ? (
          <View style={[styles.vibeBanner, { backgroundColor: c.accentSoft }]}>
            <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
              ✨ Vibe mode attiva
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {host.nome} ti invita a fermarti a bere insieme una volta consegnate le birre. È sempre
              facoltativo: puoi anche consegnare e andare via.
            </ThemedText>
          </View>
        ) : null}

        {/* Birre richieste */}
        <Section title="Birre richieste">
          {request.birre.map((b, i) => (
            <View
              key={`${b.nome}-${i}`}
              style={[
                styles.beerRow,
                i < request.birre.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              ]}>
              <ThemedText>
                {b.nome}
                {b.formato ? ` · ${formatLabel(b.formato)}` : ''}
              </ThemedText>
              <ThemedText type="defaultSemiBold">{b.quantita}×</ThemedText>
            </View>
          ))}
        </Section>

        {/* Consegna */}
        <Section title="Consegna">
          {canSeeAddress ? (
            <ThemedText>{request.indirizzo}</ThemedText>
          ) : (
            <ThemedText style={{ color: c.textSecondary }}>
              📍 Indirizzo esatto visibile dopo l’accettazione.
            </ThemedText>
          )}
          {request.fascia ? (
            <ThemedText style={{ color: c.textSecondary }}>Quando: {request.fascia}</ThemedText>
          ) : null}
          {distanceKm != null ? (
            <ThemedText style={{ color: c.textSecondary }}>~{distanceKm.toFixed(1)} km da te</ThemedText>
          ) : null}
          {!canSeeAddress && hasCoords ? (
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              La mappa mostra la zona approssimativa; l’indirizzo esatto dopo l’accettazione.
            </ThemedText>
          ) : null}
          {hasCoords ? (
            <DeliveryMap lat={request.lat as number} lng={request.lng as number} height={180} />
          ) : null}
        </Section>

        {/* Crediti */}
        <Section title="Ricompensa">
          <ThemedText type="title" style={{ color: c.accent }}>
            {request.creditiOfferti} crediti
          </ThemedText>
          {request.stato === 'richiesto' && !isHost ? (
            <ThemedText style={{ color: c.textSecondary }}>
              {distanceKm != null
                ? `Se accetti tu si aggiunge un bonus distanza di circa ${estimateBonus(distanceKm)} crediti (massimo ${CREDIT_CAP} totali).`
                : `Quando accetti si aggiunge un bonus in base alla tua distanza (massimo ${CREDIT_CAP} totali).`}
            </ThemedText>
          ) : null}
          <ThemedText style={{ color: c.textSecondary }}>
            Più il rimborso esatto della spesa, al momento della consegna.
          </ThemedText>
        </Section>
      </ScrollView>

      {/* Footer azione (dipende da ruolo e stato) */}
      <SafeAreaView
        edges={['bottom']}
        style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        {actionError ? (
          <ThemedText style={[styles.actionError, { color: c.danger }]}>{actionError}</ThemedText>
        ) : null}
        {canSeeAddress && request.stato !== 'richiesto' && request.stato !== 'confermato' ? (
          <Button
            label="Apri chat"
            variant="secondary"
            onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: id } } as never)}
          />
        ) : null}
        {renderFooter()}
      </SafeAreaView>

      <ReportModal
        visible={reportOpen}
        title="Segnala richiesta"
        reason={reportReason}
        details={reportDetails}
        loading={reportLoading}
        onReasonChange={setReportReason}
        onDetailsChange={setReportDetails}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />
    </ThemedView>
  );
}

function StatusNote({ text }: { text: string }) {
  const c = useColors();
  return <ThemedText style={[styles.statusNote, { color: c.textSecondary }]}>{text}</ThemedText>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  hostInfo: {
    flex: 1,
    gap: 2,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
  },
  vibeBanner: {
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  beerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  actionError: {
    textAlign: 'center',
  },
  footerActions: {
    gap: Spacing.sm,
  },
  statusNote: {
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});
