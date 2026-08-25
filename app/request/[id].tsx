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
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { acceptOrder, advanceOrder, arriveOrder, cancelActiveOrder, cancelOrder, cancelStaleOrder, confirmExchangeNearby, confirmOrder, getDeliveryCodeState, getOrderEta, getOrderSafetyEvents, getRequestById, regenerateDeliveryCode, releaseAcceptedOrder, reportOrderIssue, reportUser, creaLinkGiro, setOrderEta, updateOrderPresence, verifyDeliveryCode } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { CREDIT_CAP, estimateBonus, FORMATS } from '@/lib/credits';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import { motivoNonAgibile, ORDER_TIMELINE, STATO_LABEL } from '@/lib/orders';
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
        message: `Sto facendo un giro su Beer to Beer. Puoi seguirlo qui, si apre anche senza l'app: ${link}`,
      });
    } catch (e) {
      Alert.alert('Link non creato', messaggioServer(e, 'Riprova fra poco.'));
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
    return messaggioServer(e, 'Operazione non riuscita. Riprova.');
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
      'Annulli il giro?',
      'Sparisce dal feed e i BeerCoin impegnati tornano tuoi. Nessuna penalità.',
      [
        { text: 'Lascio aperto', style: 'cancel' },
        { text: 'Annulla il giro', style: 'destructive', onPress: () => eseguiAnnullamento('') },
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

  async function handleEta(minutes: number) {
    await runAction(async () => { await setOrderEta(id, minutes); setEtaMinutes(minutes); toast.show(`Arrivo stimato: ${minutes} minuti.`); });
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
          ? 'Giro fermato. Gli amministratori sono stati avvisati.'
          : type === 'request_mismatch'
            ? 'Segnalazione inviata agli amministratori.'
            : 'Comunicato all altra persona.',
      );
      // «Non mi sento al sicuro» congela il giro: la schermata deve
      // aggiornarsi, o continua a mostrare pulsanti che ora il server rifiuta.
      if (type === 'unsafe') await reload();
    });
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
      return (
        <View style={styles.footerActions}>
          <StatusNote text={`${chiPorta?.nome ?? 'Chi porta'} ha accettato e si sta organizzando.`} />
          <Button label="Annulla il giro" variant="secondary" onPress={handleCancel} loading={acting} />
        </View>
      );
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
        {fermo ? (
          <View style={[styles.fermoRow, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
            <ThemedText type="label" style={{ color: c.danger }}>{fermo.toUpperCase()}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              Finche resta cosi non si puo fare niente su questo giro. Se pensi sia un errore,
              scrivilo dal profilo: lo legge chi modera.
            </ThemedText>
          </View>
        ) : null}

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
              <ThemedText type="label" style={{ color: c.textSecondary }}>PORTA LE BIRRE</ThemedText>
              <ThemedText type="subtitle">{chiPorta.nome}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                {chiPorta.eta} anni · {chiPorta.scambiCompletati} giri
              </ThemedText>
            </View>
            <BrandIcon name="arrow-right" size={20} color={c.textSecondary} />
          </Pressable>
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
          <Section title="Se qualcosa non va">
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
              label={condividendo ? 'Preparo il link...' : 'Fai seguire il giro a qualcuno'}
              variant="secondary"
              loading={condividendo}
              onPress={condividiGiro}
            />
            <ThemedText type="caption" style={{ color: c.textSecondary }}>
              {isDriver
                ? 'Si apre da qualsiasi telefono, anche senza app. Mostra dove sei e a che punto e il giro. Scade dopo 12 ore.'
                : 'Si apre da qualsiasi telefono, anche senza app. Mostra a che punto e il giro, mai il tuo indirizzo. La posizione di chi porta puo condividerla solo lui.'}
            </ThemedText>

            <View style={styles.issueGrid}>
              <Button
                label="Sono in ritardo"
                size="md"
                variant="secondary"
                onPress={() => handleIssue('delay')}
              />
              <Button
                label="Non trovo la persona"
                size="md"
                variant="secondary"
                onPress={() => handleIssue('person_absent')}
              />
              <Button
                label="Non e il giro concordato"
                size="md"
                variant="secondary"
                onPress={() => setChiediDettagli('request_mismatch')}
              />
              <Button
                label="Non mi sento al sicuro"
                size="md"
                variant="danger"
                onPress={() => setChiediDettagli('unsafe')}
              />
              {canCloseStale ? (
                <Button
                  label="Chiudi giro bloccato"
                  size="md"
                  variant="secondary"
                  onPress={() => runAction(() => cancelStaleOrder(id))}
                />
              ) : null}
            </View>
            <ThemedText type="caption" style={{ color: c.textSecondary }}>
              Le ultime due arrivano agli amministratori. «Non mi sento al sicuro» ferma subito il giro.
            </ThemedText>
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

      <TestoModal
        visible={annullaOpen}
        titolo="Perché annulli?"
        spiegazione={`${chiPorta?.nome ?? 'Chi porta'} ha già accettato e potrebbe essere già uscito. Due parole bastano: le legge solo lui.`}
        placeholder="Es. mi si sono presentati degli amici con le birre"
        etichettaConferma="Annulla il giro"
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
        title="Segnala richiesta"
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
        titolo={chiediDettagli === 'unsafe' ? 'Cosa sta succedendo?' : 'Cosa non torna?'}
        spiegazione={
          chiediDettagli === 'unsafe'
            ? 'Il giro viene fermato subito e la segnalazione arriva agli amministratori. Scrivi cosa sta succedendo: senza sapere cosa e successo non possono aiutarti davvero. Se sei in pericolo immediato chiama il 112.'
            : 'La segnalazione arriva agli amministratori, e l altra persona potra dare la sua versione. Scrivi cosa era stato concordato e cosa e arrivato.'
        }
        placeholder={chiediDettagli === 'unsafe' ? 'Es. non se ne va da davanti al portone' : 'Es. avevo chiesto sei birre, ne sono arrivate due'}
        etichettaConferma={chiediDettagli === 'unsafe' ? 'Ferma il giro' : 'Segnala'}
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
