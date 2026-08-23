import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
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
import { BrandIcon } from '@/components/ui/brand-icon';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { acceptOrder, advanceOrder, arriveOrder, cancelActiveOrder, cancelOrder, cancelStaleOrder, confirmExchangeNearby, confirmOrder, getDeliveryCodeState, getOrderEta, getOrderSafetyEvents, getRequestById, regenerateDeliveryCode, releaseAcceptedOrder, reportOrderIssue, reportUser, saveTrustedContact, setOrderEta, updateOrderPresence, verifyDeliveryCode } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { CREDIT_CAP, estimateBonus, FORMATS } from '@/lib/credits';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import { ORDER_TIMELINE, STATO_LABEL } from '@/lib/orders';
import { nextOrderAction } from '@/lib/discovery';
import type { BeerRequest, DeliveryCodeState, OrderIssueType, OrderSafetyEvent, ReportReason } from '@/types';

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
  const [deliveryCode, setDeliveryCode] = useState<DeliveryCodeState | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [safetyEvents, setSafetyEvents] = useState<OrderSafetyEvent[]>([]);
  const [trustedName, setTrustedName] = useState('');
  const [trustedContact, setTrustedContact] = useState('');
  const [handshakeStatus, setHandshakeStatus] = useState<'idle'|'waiting'|'code_required'|'too_far'>('idle');

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
          if (active) {
            setRequest(r);
            if (r && r.host.id === session?.user.id && r.stato !== 'richiesto') {
              getDeliveryCodeState(id).then(setDeliveryCode).catch(() => setDeliveryCode(null));
            }
            if (r && r.stato !== 'richiesto') {
              getOrderEta(id).then(setEtaMinutes).catch(() => null);
              getOrderSafetyEvents(id).then(setSafetyEvents).catch(() => setSafetyEvents([]));
            }
          }
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
    }, [id, session?.user.id]),
  );

  const reload = useCallback(async () => {
    try {
      setRequest(await getRequestById(id));
    } catch {
      // teniamo lo stato corrente in caso di errore di refresh
    }
  }, [id]);

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

  // Aggiornamento automatico del giro in corso.
  // Prima era ogni 3 secondi per tutta la consegna, e il timer si ricreava ad
  // ogni risposta (la dipendenza era l'intero oggetto `request`, che cambia
  // identità ogni volta): mezz'ora di consegna erano oltre mille chiamate a
  // testa, fra batteria e traffico. Ora dipende solo dallo STATO, e la
  // frequenza segue il momento: fitta solo quando i due sono uno davanti
  // all'altro e aspettano la conferma reciproca, tranquilla nel resto del giro.
  const statoCorrente = request?.stato;
  useEffect(() => {
    if (!statoCorrente || !['accettato', 'in_consegna', 'arrivato', 'consegnato'].includes(statoCorrente)) return;
    const intervallo = statoCorrente === 'arrivato' ? 3000 : 10000;
    const timer = setInterval(() => { reload(); }, intervallo);
    return () => clearInterval(timer);
  }, [statoCorrente, reload]);

  // Invio periodico della posizione, che alimenta la conferma per vicinanza.
  // Dipende dallo stato e non dalle coordinate: prima ogni nuova posizione
  // faceva ripartire l'effetto, rimandando subito tutto da capo.
  const presenzaFallitaRef = useRef(false);
  useEffect(() => {
    if (!statoCorrente || !['accettato', 'in_consegna', 'arrivato', 'consegnato'].includes(statoCorrente)) return;
    let vivo = true;
    const invia = async () => {
      const coords = await getCurrentCoords();
      if (!vivo || !coords) return;
      setDriverCoords(coords);
      updateOrderPresence(id, coords).catch(() => {
        // Senza presenza la conferma per vicinanza non si sblocca mai: va detto,
        // ma una volta sola — non un avviso ogni quindici secondi.
        if (presenzaFallitaRef.current) return;
        presenzaFallitaRef.current = true;
        toast.show('Non riesco a inviare la tua posizione: usate il codice di consegna.', 'error');
      });
    };
    invia();
    const timer = setInterval(invia, 15000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [statoCorrente, id, toast]);

  async function handleTrustedContact() {
    if (!trustedName.trim() || !trustedContact.trim()) return;
    await runAction(async () => {
      await saveTrustedContact(id, trustedName, trustedContact);
      toast.show('Contatto fidato salvato per questo giro.');
    });
  }

  async function handleEta(minutes: number) {
    await runAction(async () => { await setOrderEta(id, minutes); setEtaMinutes(minutes); toast.show(`Arrivo stimato: ${minutes} minuti.`); });
  }

  async function handleIssue(type: OrderIssueType) {
    await runAction(async () => { await reportOrderIssue(id, type); toast.show(type === 'unsafe' ? 'Safety Center avvisato.' : 'Imprevisto comunicato.'); });
  }

  async function handleRegenerateCode() {
    await runAction(async () => { await regenerateDeliveryCode(id); setDeliveryCode(await getDeliveryCodeState(id)); toast.show('Nuovo codice pronto.'); });
  }

  async function handleNearbyConfirm() {
    setActing(true); setActionError(null);
    try {
      const coords = await getCurrentCoords();
      if (!coords) { setHandshakeStatus('code_required'); return; }
      const result = await confirmExchangeNearby(id, coords);
      if (result.status === 'completed') { toast.show('Scambio confermato. Buona birra!'); await reload(); }
      else { setHandshakeStatus(result.status); if (result.status === 'waiting') toast.show('Confermato. Manca solo l’altra persona.'); }
    } catch (e) { setActionError(errorMessage(e)); } finally { setActing(false); }
  }

  function askRelease() {
    Alert.alert('Liberare il giro?', 'La richiesta tornerà disponibile e non ci saranno penalità.', [
      { text: 'Resta nel giro', style: 'cancel' },
      { text: 'Libera', style: 'destructive', onPress: () => runAction(() => releaseAcceptedOrder(id)) },
    ]);
  }

  function askSeriousCancel() {
    Alert.alert('Perché devi fermarti?', 'Dopo la partenza il motivo viene registrato per sicurezza.', [
      { text: 'Emergenza', onPress: () => runAction(() => cancelActiveOrder(id, 'emergenza')) },
      { text: 'Guasto o incidente', onPress: () => runAction(() => cancelActiveOrder(id, 'guasto')) },
      { text: 'Non è sicuro', style: 'destructive', onPress: () => runAction(() => cancelActiveOrder(id, 'non_sicuro')) },
      { text: 'Annulla', style: 'cancel' },
    ]);
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
  const nextAction = nextOrderAction(request, myId);
  const canSeeAddress = isHost || isDriver;
  // 24h dall'ULTIMO aggiornamento, non dalla creazione: è la regola che applica
  // cancel_stale_order lato server. Con createdAt il pulsante compariva anche su
  // giri appena movimentati, e il server lo rifiutava.
  const ultimoMovimento = request.updatedAt ?? request.createdAt;
  const canCloseStale = canSeeAddress && !['richiesto','confermato','annullato'].includes(request.stato) && Date.now()-new Date(ultimoMovimento).getTime()>24*3600*1000;

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
          <View style={styles.footerActions}>
            <Button label="Inizia consegna" onPress={() => runAction(() => advanceOrder(id, 'in_consegna'))} loading={acting} />
            <Button label="Ho cambiato idea: libera" variant="secondary" onPress={askRelease} />
          </View>
        );
      }
      return <StatusNote text="Un driver ha accettato e si sta organizzando." />;
    }

    if (stato === 'in_consegna') {
      if (isDriver) {
        return (
          <Button
            label="Sono arrivato"
            onPress={() => runAction(() => arriveOrder(id))}
            loading={acting}
          />
        );
      }
      return <StatusNote text="La birra è in arrivo." />;
    }

    if (stato === 'arrivato') {
      if ((isHost || isDriver) && handshakeStatus === 'idle') {
        return <View style={styles.codeForm}><ThemedText type="defaultSemiBold">Siete insieme?</ThemedText><ThemedText type="caption">Un tocco a testa. Verifichiamo solo che i telefoni siano vicini.</ThemedText><Button label="Conferma scambio" onPress={handleNearbyConfirm} loading={acting} /><Button label="La posizione non funziona" variant="secondary" onPress={() => setHandshakeStatus('code_required')} /></View>;
      }
      if (handshakeStatus === 'waiting') {
        return <View style={styles.codeForm}><ThemedText type="defaultSemiBold">La tua conferma è registrata</ThemedText><ThemedText type="caption">Manca solo l’altra persona. La pagina si aggiorna automaticamente.</ThemedText><Button label="Verifica di nuovo" variant="secondary" onPress={handleNearbyConfirm} /></View>;
      }
      if (isDriver) {
        return (
          <View style={styles.codeForm}>
            <ThemedText type="defaultSemiBold">Chiedi il codice all’host</ThemedText>
            <TextInput
              value={codeInput}
              onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="000"
              placeholderTextColor={c.textSecondary}
              style={[styles.codeInput, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            />
            <Button label="Conferma con codice" disabled={codeInput.length !== 3} onPress={() => runAction(() => verifyDeliveryCode(id, codeInput))} loading={acting} />
          </View>
        );
      }
      return <StatusNote text="Chi porta è arrivato. Comunica il codice solo quando siete insieme." />;
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
      <Stack.Screen options={{ title: 'Dettaglio giro' }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.liveHero, { backgroundColor: c.accent }]}>
          <ThemedText type="label" style={{ color: c.accentText }}>PROSSIMA AZIONE</ThemedText>
          <ThemedText type="title" style={{ color: c.accentText }}>{nextAction.label}</ThemedText>
          <ThemedText style={{ color: c.accentText, opacity: 0.72 }}>{STATO_LABEL[request.stato]}{etaMinutes ? ` · ${etaMinutes} min` : ''}</ThemedText>
        </View>
        {/* Stato corrente + segnalazione */}
        <View style={styles.statusRow}>
          <Badge label={STATO_LABEL[request.stato]} tone="accent" />
          {!isHost && request.stato === 'richiesto' ? (
            <Pressable onPress={() => setReportOpen(true)} hitSlop={8}>
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>Segnala</ThemedText>
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
              {host.eta} anni · {host.ratingMedio.toFixed(1)} su 5 · {host.scambiCompletati} giri
            </ThemedText>
          </View>
          <BrandIcon name="arrow-right" size={20} color={c.textSecondary} />
        </Pressable>
        {host.bio ? (
          <ThemedText style={[styles.bio, { color: c.textSecondary }]}>{host.bio}</ThemedText>
        ) : null}

        {/* Banner vibe mode */}
        {request.vibeMode ? (
          <View style={[styles.vibeBanner, { backgroundColor: c.accentSoft }]}>
            <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
              VIBE MODE ATTIVA
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {host.nome} ti invita a fermarti a bere insieme una volta consegnate le birre. È sempre
              facoltativo: puoi anche consegnare e andare via.
            </ThemedText>
          </View>
        ) : null}

        {isDriver && ['accettato', 'in_consegna'].includes(request.stato) ? (
          <Section title="Quanto manca?">
            <View style={styles.quickRow}>{[10, 20, 30, 45].map((minutes) => <Chip key={minutes} label={`${minutes} min`} active={etaMinutes === minutes} onPress={() => handleEta(minutes)} />)}</View>
            <Button label="Sono in ritardo" size="md" variant="secondary" onPress={() => handleIssue('delay')} />
          </Section>
        ) : null}

        {(isHost || isDriver) && ['in_consegna', 'arrivato'].includes(request.stato) ? (
          <Button label="Devo fermare il giro" variant="danger" onPress={askSeriousCancel} />
        ) : null}

        <Section title="Stato del giro">
          <View style={styles.timeline}>
            {ORDER_TIMELINE.map((step, index) => {
              const current = ORDER_TIMELINE.indexOf(request.stato);
              const done = index <= current;
              return (
                <View key={step} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: done ? c.accent : c.surfaceAlt, borderColor: done ? c.accent : c.border }]}>
                    {done ? <BrandIcon name="check" size={12} color={c.accentText} /> : null}
                  </View>
                  <ThemedText type={step === request.stato ? 'defaultSemiBold' : 'caption'} style={{ color: done ? c.text : c.textSecondary }}>{STATO_LABEL[step]}</ThemedText>
                </View>
              );
            })}
          </View>
          {safetyEvents.length ? <View style={styles.eventList}>{safetyEvents.slice(-6).map((event) => <View key={event.id} style={styles.eventRow}><BrandIcon name="check" size={14} color={c.positive} /><ThemedText type="caption">{eventLabel(event.eventType)} · {new Date(event.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</ThemedText></View>)}</View> : null}
        </Section>

        {isHost && deliveryCode?.code && ['accettato', 'in_consegna', 'arrivato'].includes(request.stato) ? (
          <Section title="Codice di consegna">
            <ThemedText style={[styles.deliveryCode, { color: c.accent }]}>{deliveryCode.code}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>Comunicalo solo quando chi porta è davanti a te.</ThemedText>
            <ThemedText type="caption">Tentativi disponibili: {deliveryCode.attemptsRemaining}. Il codice scade automaticamente.</ThemedText>
            <Button label="Genera nuovo codice" size="md" variant="secondary" onPress={handleRegenerateCode} />
          </Section>
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
              Indirizzo esatto visibile dopo l’accettazione.
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
        <Section title="BeerCoin">
          <ThemedText type="title" style={{ color: c.accent }}>
            {request.creditiOfferti} BC
          </ThemedText>
          {request.stato === 'richiesto' && !isHost ? (
            <ThemedText style={{ color: c.textSecondary }}>
              {distanceKm != null
                ? `Se accetti tu si aggiunge un bonus distanza di circa ${estimateBonus(distanceKm)} crediti (massimo ${CREDIT_CAP} totali).`
                : `Quando accetti si aggiunge un bonus in base alla tua distanza (massimo ${CREDIT_CAP} totali).`}
            </ThemedText>
          ) : null}
          <ThemedText style={{ color: c.textSecondary }}>Credito chiuso: non si compra, non si trasferisce, non si converte.</ThemedText>
        </Section>

        {canSeeAddress && request.stato !== 'richiesto' && request.stato !== 'confermato' ? (
          <Section title="Sicurezza">
            <Button
              label="Condividi stato del giro"
              variant="secondary"
              onPress={() => Share.share({ message: `BeerToBeer · Giro ${STATO_LABEL[request.stato]} · ${request.citta ?? 'città'} · beertobeer://request/${request.id}` })}
            />
            <ThemedText type="caption">Il messaggio non contiene l’indirizzo esatto.</ThemedText>
            <View style={styles.trustedForm}>
              <ThemedText type="defaultSemiBold">Contatto fidato</ThemedText>
              <TextInput value={trustedName} onChangeText={setTrustedName} placeholder="Nome" placeholderTextColor={c.textSecondary} style={[styles.safetyInput, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]} />
              <TextInput value={trustedContact} onChangeText={setTrustedContact} placeholder="Telefono o contatto" placeholderTextColor={c.textSecondary} style={[styles.safetyInput, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]} />
              <Button label="Salva per questo giro" size="md" variant="secondary" disabled={!trustedName.trim() || !trustedContact.trim()} onPress={handleTrustedContact} />
            </View>
            <View style={styles.issueGrid}>
              <Button label="Non trovo la persona" size="md" variant="secondary" onPress={() => handleIssue('person_absent')} />
              <Button label="Richiesta diversa" size="md" variant="secondary" onPress={() => handleIssue('request_mismatch')} />
              <Button label="Non mi sento al sicuro" size="md" variant="danger" onPress={() => handleIssue('unsafe')} />
              {canCloseStale ? <Button label="Chiudi giro bloccato" size="md" variant="danger" onPress={() => runAction(() => cancelStaleOrder(id))} /> : null}
            </View>
          </Section>
        ) : null}
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

function eventLabel(type: OrderSafetyEvent['eventType']): string {
  const labels: Record<OrderSafetyEvent['eventType'], string> = {
    accepted: 'Giro accettato', started: 'Partenza o ETA aggiornata', arrived: 'Arrivo registrato',
    code_failed: 'Codice non valido', code_verified: 'Codice verificato', exited: 'Uscita dal giro',
    shared: 'Stato condiviso', reported: 'Imprevisto registrato', completed: 'Giro completato',
  };
  return labels[type];
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
  timeline: { gap: Spacing.sm },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deliveryCode: { fontSize: 44, lineHeight: 50, letterSpacing: 8, textAlign: 'center' },
  codeForm: { gap: Spacing.sm },
  codeInput: { height: 58, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 28, letterSpacing: 8 },
  trustedForm: { gap: Spacing.sm, marginTop: Spacing.sm },
  safetyInput: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.md },
  liveHero: { borderRadius: 12, padding: Spacing.md, gap: 3 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  eventList: { marginTop: Spacing.sm, gap: 6 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  issueGrid: { gap: Spacing.sm, marginTop: Spacing.sm },
});
