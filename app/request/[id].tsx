import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DeliveryMap } from '@/components/delivery-map';
import { TestoModal } from '@/components/testo-modal';
import { messaggioServer } from '@/lib/errori';
import { ReportModal } from '@/components/report-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { BrandIcon } from '@/components/ui/brand-icon';
import { Chip } from '@/components/ui/chip';
import { GIRO, PAROLE, VOCE } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { acceptOrder, advanceOrder, arriveOrder, cancelActiveOrder, cancelOrder, cancelStaleOrder, confirmExchangeNearby, confirmOrder, getDeliveryCodeState, getOrderEta, getOrderSafetyEvents, getRequestById, regenerateDeliveryCode, releaseAcceptedOrder, reportOrderIssue, reportUser, creaLinkGiro, setOrderEta, updateOrderPresence, verifyDeliveryCode } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { CREDIT_CAP, estimateBonus, FORMATS } from '@/lib/credits';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import { motivoNonAgibile, ORDER_TIMELINE, REQUEST_TTL_HOURS, STATO_LABEL } from '@/lib/orders';
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
  const [annullaOpen, setAnnullaOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('ordine_falso');
  const [reportDetails, setReportDetails] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [deliveryCode, setDeliveryCode] = useState<DeliveryCodeState | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [safetyEvents, setSafetyEvents] = useState<OrderSafetyEvent[]>([]);
  /**
   * Quale segnalazione sta chiedendo due righe di spiegazione.
   * null = nessuna finestra aperta.
   */
  const [chiediDettagli, setChiediDettagli] = useState<OrderIssueType | null>(null);
  const [condividendo, setCondividendo] = useState(false);

  /**
   * Crea il link pubblico e apre il foglio di condivisione del telefono, cosi'
   * si manda su WhatsApp, per messaggio o come si vuole.
   */
  async function condividiGiro() {
    setCondividendo(true);
    try {
      const link = await creaLinkGiro(id);
      await Share.share({
        message: GIRO.dettaglio.linkMessaggio(link),
      });
    } catch (e) {
      Alert.alert(GIRO.dettaglio.linkNonCreato, messaggioServer(e, VOCE.riserva.riprovaFraPoco));
    } finally {
      setCondividendo(false);
    }
  }
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

  // Il messaggio del database non si butta via: i limiti e le guardie sono
  // scritti per essere letti da chi usa l'app («Hai gia' 3 giri aperti»,
  // «Non comprare nulla»). messaggioServer lo mostra, e mette una frase di
  // riserva solo quando davvero non c'e' niente da dire.
  function errorMessage(e: unknown): string {
    return messaggioServer(e, GIRO.dettaglio.nonRiuscita);
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

  async function eseguiAnnullamento(motivo: string) {
    setActing(true);
    setActionError(null);
    try {
      await cancelOrder(id, motivo);
      router.back();
    } catch (e) {
      setActionError(errorMessage(e));
      setActing(false);
    }
  }

  /**
   * Annullare non era mai stato una decisione: un tocco, e il giro spariva.
   * Ora si conferma — e se qualcuno ha gia' accettato si scrive il perche',
   * perche' quella persona potrebbe essere gia' uscita di casa o aver gia'
   * comprato le birre. Le due parole che scrivi sono l'unica cosa che glielo
   * spiega.
   */
  function handleCancel() {
    if (request?.driverId) {
      setAnnullaOpen(true);
      return;
    }
    Alert.alert(
      GIRO.dettaglio.annulliTitolo,
      GIRO.dettaglio.annulliTesto,
      [
        { text: GIRO.dettaglio.lascioAperto, style: 'cancel' },
        { text: GIRO.dettaglio.annullaGiro, style: 'destructive', onPress: () => eseguiAnnullamento('') },
      ],
    );
  }

  async function handleReport() {
    if (!request) return;
    setReportLoading(true);
    try {
      await reportUser(request.host.id, reportReason, reportDetails, request.id);
      setReportOpen(false);
      setReportDetails('');
      toast.show(GIRO.dettaglio.segnalataInviata);
    } catch {
      toast.show(GIRO.dettaglio.segnalataNonInviata, 'error');
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
        toast.show(GIRO.dettaglio.posizioneNonParte, 'error');
      });
    };
    invia();
    const timer = setInterval(invia, 15000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [statoCorrente, id, toast]);

  async function handleEta(minutes: number) {
    await runAction(async () => { await setOrderEta(id, minutes); setEtaMinutes(minutes); toast.show(GIRO.dettaglio.arrivoStimato(minutes)); });
  }

  async function handleIssue(type: OrderIssueType, dettagli = '') {
    await runAction(async () => {
      await reportOrderIssue(id, type, dettagli);
      setChiediDettagli(null);
      // Prima diceva sempre «Safety Center avvisato», e non era vero: la
      // segnalazione finiva in una tabella che nessuno leggeva. Ora e' vero, e
      // il messaggio dice cosa succede davvero.
      toast.show(
        type === 'unsafe'
          ? GIRO.dettaglio.fermatoAvvisati
          : type === 'request_mismatch'
            ? GIRO.dettaglio.inviataAgliAdmin
            : GIRO.dettaglio.altroLoSa,
      );
      // «Non mi sento al sicuro» congela il giro: la schermata deve
      // aggiornarsi, o continua a mostrare pulsanti che ora il server rifiuta.
      if (type === 'unsafe') await reload();
    });
  }

  async function handleRegenerateCode() {
    await runAction(async () => { await regenerateDeliveryCode(id); setDeliveryCode(await getDeliveryCodeState(id)); toast.show(GIRO.dettaglio.codicePronto); });
  }

  async function handleNearbyConfirm() {
    setActing(true); setActionError(null);
    try {
      const coords = await getCurrentCoords();
      if (!coords) { setHandshakeStatus('code_required'); return; }
      const result = await confirmExchangeNearby(id, coords);
      if (result.status === 'completed') { toast.show(GIRO.dettaglio.scambioFatto); await reload(); }
      else { setHandshakeStatus(result.status); if (result.status === 'waiting') toast.show(GIRO.dettaglio.confermatoMancaAltro); }
    } catch (e) { setActionError(errorMessage(e)); } finally { setActing(false); }
  }

  function askRelease() {
    Alert.alert(GIRO.dettaglio.liberaTitolo, GIRO.dettaglio.liberaTesto, [
      { text: GIRO.dettaglio.restaNelGiro, style: 'cancel' },
      { text: GIRO.dettaglio.liberaConferma, style: 'destructive', onPress: () => runAction(() => releaseAcceptedOrder(id)) },
    ]);
  }

  function askSeriousCancel() {
    Alert.alert(GIRO.dettaglio.fermartiTitolo, GIRO.dettaglio.fermartiTesto, [
      { text: GIRO.dettaglio.emergenza, onPress: () => runAction(() => cancelActiveOrder(id, 'emergenza')) },
      { text: GIRO.dettaglio.guasto, onPress: () => runAction(() => cancelActiveOrder(id, 'guasto')) },
      { text: GIRO.dettaglio.nonSicuro, style: 'destructive', onPress: () => runAction(() => cancelActiveOrder(id, 'non_sicuro')) },
      { text: VOCE.azione.annulla, style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: GIRO.dettaglio.titolo(PAROLE.giro) }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: GIRO.dettaglio.titolo(PAROLE.giro) }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">{GIRO.dettaglio.scadutoTitolo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>
            {GIRO.dettaglio.scadutoTesto(REQUEST_TTL_HOURS)}
          </ThemedText>
          <Button label={GIRO.dettaglio.tornaAlFeed} variant="secondary" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  const { host } = request;
  // Chi porta si mostra a chi ha lanciato il giro e a chiunque altro guardi la
  // scheda: e sempre chi PORTA che va identificato, mai chi riceve.
  const chiPorta = request.driver;
  const myId = session?.user.id;
  const isHost = host.id === myId;
  const isDriver = request.driverId != null && request.driverId === myId;
  const nextAction = nextOrderAction(request, myId);
  const fermo = motivoNonAgibile(request);
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
    // Un giro congelato, rimosso o scaduto non ha azioni: il server le rifiuta
    // tutte, e un pulsante che fallisce e' peggio di nessun pulsante. La banda
    // in cima alla schermata dice gia' perche'.
    if (motivoNonAgibile(request)) return null;
    const stato = request.stato;

    if (stato === 'richiesto') {
      if (isHost) {
        return <Button label={GIRO.dettaglio.annullaGiro} variant="danger" onPress={handleCancel} loading={acting} />;
      }
      return (
        <Button
          label={GIRO.dettaglio.accetta}
          onPress={() => runAction(() => acceptOrder(id, driverCoords))}
          loading={acting}
        />
      );
    }

    if (stato === 'accettato') {
      if (isDriver) {
        return (
          <View style={styles.footerActions}>
            <Button label={GIRO.dettaglio.parti} onPress={() => runAction(() => advanceOrder(id, 'in_consegna'))} loading={acting} />
            <Button label={GIRO.dettaglio.libera} variant="secondary" onPress={askRelease} />
          </View>
        );
      }
      return (
        <View style={styles.footerActions}>
          <StatusNote text={GIRO.dettaglio.haAccettato(chiPorta?.nome ?? PAROLE.chiPorta)} />
          <Button label={GIRO.dettaglio.annullaGiro} variant="secondary" onPress={handleCancel} loading={acting} />
        </View>
      );
    }

    if (stato === 'in_consegna') {
      if (isDriver) {
        return (
          <Button
            label={GIRO.dettaglio.sonoArrivato}
            onPress={() => runAction(() => arriveOrder(id))}
            loading={acting}
          />
        );
      }
      return <StatusNote text={GIRO.dettaglio.birraInArrivo} />;
    }

    if (stato === 'arrivato') {
      if ((isHost || isDriver) && handshakeStatus === 'idle') {
        return <View style={styles.codeForm}><ThemedText type="defaultSemiBold">{GIRO.dettaglio.sieteInsieme}</ThemedText><ThemedText type="caption">{GIRO.dettaglio.unTocco}</ThemedText><Button label={GIRO.dettaglio.confermaScambio} onPress={handleNearbyConfirm} loading={acting} /><Button label={GIRO.dettaglio.posizioneNonVa} variant="secondary" onPress={() => setHandshakeStatus('code_required')} /></View>;
      }
      if (handshakeStatus === 'waiting') {
        return <View style={styles.codeForm}><ThemedText type="defaultSemiBold">{GIRO.dettaglio.confermaRegistrata}</ThemedText><ThemedText type="caption">{GIRO.dettaglio.mancaAltro}</ThemedText><Button label={GIRO.dettaglio.verificaDiNuovo} variant="secondary" onPress={handleNearbyConfirm} /></View>;
      }
      if (isDriver) {
        return (
          <View style={styles.codeForm}>
            <ThemedText type="defaultSemiBold">{GIRO.dettaglio.chiediCodice(host.nome)}</ThemedText>
            <TextInput
              value={codeInput}
              onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="000"
              placeholderTextColor={c.textSecondary}
              style={[styles.codeInput, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            />
            <Button label={GIRO.dettaglio.confermaConCodice} disabled={codeInput.length !== 3} onPress={() => runAction(() => verifyDeliveryCode(id, codeInput))} loading={acting} />
          </View>
        );
      }
      return <StatusNote text={GIRO.dettaglio.comunicaCodice} />;
    }

    if (stato === 'consegnato') {
      const iConfirmed = isHost ? request.hostConfermato : request.driverConfermato;
      if ((isHost || isDriver) && !iConfirmed) {
        return (
          <Button label={GIRO.dettaglio.confermaScambio} onPress={() => runAction(() => confirmOrder(id))} loading={acting} />
        );
      }
      return <StatusNote text={GIRO.dettaglio.inAttesaAltro} />;
    }

    if (isHost || isDriver) {
      return (
        <View style={styles.footerActions}>
          <Button
            label={GIRO.dettaglio.apriChat}
            variant="secondary"
            onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: id } } as never)}
          />
          <Button label={GIRO.dettaglio.lasciaRecensione} onPress={() => router.push({ pathname: '/review', params: { orderId: id } } as never)} />
        </View>
      );
    }

    return <StatusNote text={GIRO.dettaglio.completato} />;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: GIRO.dettaglio.titolo(PAROLE.giro) }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.liveHero, { backgroundColor: c.accent }]}>
          <ThemedText type="label" style={{ color: c.accentText }}>{GIRO.dettaglio.prossimaAzione}</ThemedText>
          <ThemedText type="title" style={{ color: c.accentText }}>{nextAction.label}</ThemedText>
          <ThemedText style={{ color: c.accentText, opacity: 0.72 }}>{STATO_LABEL[request.stato]}{etaMinutes ? ` · ${etaMinutes} min` : ''}</ThemedText>
        </View>
        {fermo ? (
          <View style={[styles.fermoRow, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
            {/* Il maiuscolo lo mette type="label": scriverlo anche qui con
                .toUpperCase() lo mandava urlato pure dove non c'e' foglio di
                stile. */}
            <ThemedText type="label" style={{ color: c.danger }}>{fermo}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {GIRO.dettaglio.fermoTesto}
            </ThemedText>
          </View>
        ) : null}

        {/* Stato corrente + segnalazione */}
        <View style={styles.statusRow}>
          <Badge label={STATO_LABEL[request.stato]} tone="accent" />
          {!isHost && request.stato === 'richiesto' ? (
            <Pressable onPress={() => setReportOpen(true)} hitSlop={8}>
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>{GIRO.dettaglio.segnala}</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* Profilo host (toccabile → apre il profilo) */}
        <Pressable
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: host.id } })}
          style={({ pressed }) => [styles.hostRow, { opacity: pressed ? 0.6 : 1 }]}>
          <Avatar name={host.nome} size={56} uri={host.fotoUrl} />
          <View style={styles.hostInfo}>
            {/* type="nome": il nome di una persona non si urla. */}
            <ThemedText type="nome">{host.nome}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {GIRO.dettaglio.fattiPersona(host.eta, host.scambiCompletati)}
            </ThemedText>
          </View>
          <BrandIcon name="arrow-right" size={20} color={c.textSecondary} />
        </Pressable>
        {host.bio ? (
          <ThemedText style={[styles.bio, { color: c.textSecondary }]}>{host.bio}</ThemedText>
        ) : null}

        {/*
          CHI PORTA. Prima non compariva da nessuna parte: chi aveva lanciato
          il giro leggeva soltanto «un driver ha accettato», e non sapeva chi
          stesse per suonare al suo portone. In un'app che fa incontrare due
          sconosciuti a un citofono era il buco piu' grave che ci fosse.
        */}
        {chiPorta ? (
          <Pressable
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: chiPorta.id } })}
            style={({ pressed }) => [styles.hostRow, { opacity: pressed ? 0.6 : 1 }]}>
            <Avatar name={chiPorta.nome} size={56} uri={chiPorta.fotoUrl} />
            <View style={styles.hostInfo}>
              <ThemedText type="label" style={{ color: c.textSecondary }}>{GIRO.dettaglio.portaLeBirre}</ThemedText>
              <ThemedText type="nome">{chiPorta.nome}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                {GIRO.dettaglio.fattiPersona(chiPorta.eta, chiPorta.scambiCompletati)}
              </ThemedText>
            </View>
            <BrandIcon name="arrow-right" size={20} color={c.textSecondary} />
          </Pressable>
        ) : null}

        {/* Banner vibe mode */}
        {request.vibeMode ? (
          <View style={[styles.vibeBanner, { backgroundColor: c.accentSoft }]}>
            {/* type="label" e non defaultSemiBold: cosi' il maiuscolo lo mette
                il foglio di stile, e la stringa resta scritta in tondo. */}
            <ThemedText type="label" style={{ color: c.accentStrong }}>
              {GIRO.dettaglio.vibeTitolo}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {GIRO.dettaglio.vibeTesto(host.nome)}
            </ThemedText>
          </View>
        ) : null}

        {isDriver && ['accettato', 'in_consegna'].includes(request.stato) ? (
          <Section title={GIRO.dettaglio.quantoManca}>
            <View style={styles.quickRow}>{[10, 20, 30, 45].map((minutes) => <Chip key={minutes} label={GIRO.dettaglio.minuti(minutes)} active={etaMinutes === minutes} onPress={() => handleEta(minutes)} />)}</View>
            <Button label={GIRO.dettaglio.sonoInRitardo} size="md" variant="secondary" onPress={() => handleIssue('delay')} />
          </Section>
        ) : null}

        {(isHost || isDriver) && ['in_consegna', 'arrivato'].includes(request.stato) ? (
          <Button label={GIRO.dettaglio.devoFermare} variant="danger" onPress={askSeriousCancel} />
        ) : null}

        <Section title={GIRO.dettaglio.statoDelGiro}>
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
          <Section title={GIRO.dettaglio.codiceTitolo}>
            <ThemedText style={[styles.deliveryCode, { color: c.accent }]}>{deliveryCode.code}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{GIRO.dettaglio.codiceNota}</ThemedText>
            <ThemedText type="caption">{GIRO.dettaglio.codiceTentativi(deliveryCode.attemptsRemaining)}</ThemedText>
            <Button label={GIRO.dettaglio.codiceNuovo} size="md" variant="secondary" onPress={handleRegenerateCode} />
          </Section>
        ) : null}

        {/* Birre richieste */}
        <Section title={GIRO.dettaglio.birre}>
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
        <Section title={GIRO.dettaglio.dove}>
          {canSeeAddress ? (
            <ThemedText>{request.indirizzo}</ThemedText>
          ) : (
            <ThemedText style={{ color: c.textSecondary }}>
              {GIRO.dettaglio.indirizzoDopo}
            </ThemedText>
          )}
          {request.fascia ? (
            <ThemedText style={{ color: c.textSecondary }}>{GIRO.dettaglio.quando(request.fascia)}</ThemedText>
          ) : null}
          {distanceKm != null ? (
            <ThemedText style={{ color: c.textSecondary }}>{GIRO.dettaglio.distanza(distanceKm.toFixed(1))}</ThemedText>
          ) : null}
          {!canSeeAddress && hasCoords ? (
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              {GIRO.dettaglio.mappaApprossimativa}
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
                ? GIRO.dettaglio.bonusSeAccetti(estimateBonus(distanceKm), CREDIT_CAP)
                : GIRO.dettaglio.bonusQuandoAccetti(CREDIT_CAP)}
            </ThemedText>
          ) : null}
          <ThemedText style={{ color: c.textSecondary }}>{GIRO.dettaglio.monetaChiusa}</ThemedText>
        </Section>

        {canSeeAddress && request.stato !== 'richiesto' && request.stato !== 'confermato' ? (
          <Section title={GIRO.dettaglio.seQualcosaNonVa}>
            {/* Via il CONTATTO FIDATO: si salvava davvero in
                order_trusted_contacts, ma nessuno leggeva quella tabella. Un
                campo che chiede il numero di una persona cara e poi non lo usa
                per niente e' peggio che non averlo: promette una protezione
                che non esiste. Al suo posto c'e' il link qui sotto, che una
                persona fidata puo' davvero aprire. */}

            {/* IL LINK VERO. Prima il pulsante mandava beertobeer://request/<id>:
                apriva l'app, e solo a chi partecipava a quel giro. Un genitore
                senza app vedeva un link morto. */}
            <Button
              label={condividendo ? GIRO.dettaglio.linkInCorso : GIRO.dettaglio.faiSeguire(PAROLE.giro)}
              variant="secondary"
              loading={condividendo}
              onPress={condividiGiro}
            />
            <ThemedText type="caption" style={{ color: c.textSecondary }}>
              {isDriver
                ? GIRO.dettaglio.linkChiPorta(REQUEST_TTL_HOURS)
                : GIRO.dettaglio.linkChiChiede}
            </ThemedText>

            {/*
              I PULSANTI DEI GUAI COMPAIONO QUANDO C'E' UN GUAIO POSSIBILE.
              Prima erano tutti visibili dal momento in cui lanciavi un giro:
              chi aveva appena chiesto delle birre si trovava davanti «Sono in
              ritardo» e «Non trovo la persona», che a quel punto non
              significano niente — non c'e' ancora nessuno da trovare, e non
              sei tu quello che deve arrivare da qualche parte.
              Da qui in avanti: nessuno ha accettato, nessun pulsante. E «sono
              in ritardo» lo dice solo chi sta portando.
            */}
            {request.driverId ? (
            <View style={styles.issueGrid}>
              {isDriver ? (
                <Button
                  label={GIRO.dettaglio.sonoInRitardo}
                  size="md"
                  variant="secondary"
                  onPress={() => handleIssue('delay')}
                />
              ) : null}
              <Button
                label={GIRO.dettaglio.nonTrovoPersona}
                size="md"
                variant="secondary"
                onPress={() => handleIssue('person_absent')}
              />
              <Button
                label={GIRO.dettaglio.nonEIlGiro}
                size="md"
                variant="secondary"
                onPress={() => setChiediDettagli('request_mismatch')}
              />
              <Button
                label={GIRO.dettaglio.nonMiSentoAlSicuro}
                size="md"
                variant="danger"
                onPress={() => setChiediDettagli('unsafe')}
              />
              {canCloseStale ? (
                <Button
                  label={GIRO.dettaglio.chiudiBloccato}
                  size="md"
                  variant="secondary"
                  onPress={() => runAction(() => cancelStaleOrder(id))}
                />
              ) : null}
            </View>
            ) : (
              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {GIRO.dettaglio.guaiPiuTardi}
              </ThemedText>
            )}
            {request.driverId ? (
              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {GIRO.dettaglio.guaiNota}
              </ThemedText>
            ) : null}
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
            label={GIRO.dettaglio.apriChat}
            variant="secondary"
            onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: id } } as never)}
          />
        ) : null}
        {renderFooter()}
      </SafeAreaView>

      <TestoModal
        visible={annullaOpen}
        titolo={GIRO.dettaglio.percheAnnulliTitolo}
        spiegazione={GIRO.dettaglio.percheAnnulliTesto(chiPorta?.nome ?? PAROLE.chiPorta)}
        placeholder={GIRO.dettaglio.percheAnnulliSegnaposto}
        etichettaConferma={GIRO.dettaglio.annullaGiro}
        minimo={3}
        pericolo
        loading={acting}
        onClose={() => setAnnullaOpen(false)}
        onSubmit={(testo) => {
          setAnnullaOpen(false);
          void eseguiAnnullamento(testo);
        }}
      />

      <ReportModal
        visible={reportOpen}
        title={GIRO.dettaglio.segnalaGiro}
        reason={reportReason}
        details={reportDetails}
        loading={reportLoading}
        onReasonChange={setReportReason}
        onDetailsChange={setReportDetails}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />

      {/* Le due segnalazioni che arrivano agli amministratori chiedono due
          righe. Un allarme senza contesto non e' azionabile: chi lo legge non
          sa se si tratta di un cane che abbaia o di qualcuno che non se ne va
          dalla porta. */}
      <TestoModal
        visible={chiediDettagli != null}
        titolo={chiediDettagli === 'unsafe' ? GIRO.dettaglio.cosaSuccedeTitolo : GIRO.dettaglio.cosaNonTornaTitolo}
        spiegazione={
          chiediDettagli === 'unsafe'
            ? GIRO.dettaglio.unsafeSpiegazione
            : GIRO.dettaglio.mismatchSpiegazione
        }
        placeholder={chiediDettagli === 'unsafe' ? GIRO.dettaglio.unsafeSegnaposto : GIRO.dettaglio.mismatchSegnaposto}
        etichettaConferma={chiediDettagli === 'unsafe' ? GIRO.dettaglio.fermaIlGiro : GIRO.dettaglio.segnala}
        pericolo={chiediDettagli === 'unsafe'}
        loading={acting}
        onClose={() => setChiediDettagli(null)}
        onSubmit={(testo) => {
          if (chiediDettagli) void handleIssue(chiediDettagli, testo);
        }}
      />
    </ThemedView>
  );
}

function StatusNote({ text }: { text: string }) {
  const c = useColors();
  return <ThemedText style={[styles.statusNote, { color: c.textSecondary }]}>{text}</ThemedText>;
}

function eventLabel(type: OrderSafetyEvent['eventType']): string {
  return GIRO.dettaglio.evento[type];
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
  fermoRow: { borderWidth: 1, borderRadius: 10, padding: Spacing.md, gap: 4 },
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
