import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { DeliveryMap } from '@/components/delivery-map';
import { useToast } from '@/components/toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEventById, getPartecipanti, joinEvent, leaveEvent, type Partecipante } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { messaggioServer } from '@/lib/errori';
import { incontroInCorso } from '@/lib/events';
import { getCurrentCoords, haversineKm, type Coords } from '@/lib/location';
import type { BeerEvent } from '@/types';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  // Posizione di chi guarda, solo per dire quanto dista. Se il GPS non
  // risponde la scheda funziona lo stesso: la distanza semplicemente non compare.
  const [mieCoords, setMieCoords] = useState<Coords | null>(null);
  useEffect(() => { getCurrentCoords().then(setMieCoords).catch(() => null); }, []);

  const [event, setEvent] = useState<BeerEvent | null>(null);
  // Prima si vedeva solo «5 / 8 posti»: un numero non dice con chi si sta per
  // passare la serata.
  const [partecipanti, setPartecipanti] = useState<Partecipante[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([
        getEventById(id),
        // Se l'elenco dei partecipanti non arriva, la scheda funziona lo stesso.
        getPartecipanti(id).catch(() => [] as Partecipante[]),
      ]);
      setEvent(e);
      setPartecipanti(p);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleJoin() {
    if (!event) return;
    setActing(true);
    try {
      if (event.partecipo) {
        await leaveEvent(event.id);
        toast.show('Hai lasciato l’incontro.');
      } else {
        const result = await joinEvent(event.id);
        toast.show(result === 'waitlisted' ? 'Incontro pieno: sei in lista d’attesa.' : 'Partecipazione confermata.');
      }
      await load();
    } catch (e) {
      // Il database spiega perché ha rifiutato («Questo incontro è finito»):
      // sostituirlo con «operazione non riuscita» ha fatto arrivare al
      // collaudo un difetto che nessuno poteva capire.
      Alert.alert('Non è andata', messaggioServer(e, 'Operazione non riuscita. Riprova.'));
      await load();
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Giro di birra' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!event) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Giro di birra' }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">Giro non trovato</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isHost = session?.user.id === event.hostId;
  const distanzaKm =
    mieCoords && event.lat != null && event.lng != null
      ? haversineKm(mieCoords, { lat: event.lat, lng: event.lng })
      : null;
  const pieno = (event.partecipanti ?? 0) >= event.posti;
  const inCorso = incontroInCorso(event.quando);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: event.titolo }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* La locandina per prima: e' quello che fa capire in un secondo di
            che serata si tratta, molto piu' del titolo. */}
        {event.locandinaUrl ? (
          <Image source={{ uri: event.locandinaUrl }} style={styles.locandina} contentFit="cover" />
        ) : null}

        <View style={styles.titoloRiga}>
          <ThemedText type="title" style={styles.flex}>{event.titolo}</ThemedText>
          <View style={[styles.etichettaTipo, { borderColor: c.accent }]}>
            <ThemedText type="caption" style={{ color: c.accent }}>
              {event.tipo === 'evento' ? 'EVENTO' : 'INCONTRO'}
            </ThemedText>
          </View>
        </View>

        <Card style={styles.card} index={0}>
          {/* Un incontro già cominciato resta raggiungibile per sei ore. Senza
              dirlo sembra un annuncio vecchio rimasto lì per sbaglio. */}
          <Row
            label="Quando"
            value={
              inCorso
                ? `${formatDateTime(event.quando)} · è già cominciato`
                : formatDateTime(event.quando)
            }
          />
          {event.luogo ? <Row label="Dove" value={event.luogo} /> : null}
          {distanzaKm != null ? <Row label="Distanza" value={`${distanzaKm.toFixed(1)} km da te`} /> : null}
          <Row label="Posti" value={`${event.partecipanti ?? 0} / ${event.posti}`} />
        </Card>

        {/* Un incontro senza mappa costringe a chiedere «ma dove esattamente?».
            Gli eventi pubblicati prima di questa versione non hanno coordinate:
            per loro la scheda resta com'era. */}
        {event.lat != null && event.lng != null ? (
          <DeliveryMap lat={event.lat} lng={event.lng} height={180} />
        ) : null}

        {event.descrizione ? (
          <Card style={styles.card} index={1}>
            <ThemedText type="subtitle">Dettagli</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{event.descrizione}</ThemedText>
          </Card>
        ) : null}

        {event.host ? (
          <Card style={styles.hostRow} index={2}>
            <Avatar name={event.host.nome} uri={event.host.fotoUrl} size={40} />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption">Organizzato da</ThemedText>
              <ThemedText type="defaultSemiBold">{event.host.nome}</ThemedText>
            </View>
            <Button
              label="Profilo"
              variant="secondary"
              size="md"
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: event.hostId } } as never)}
            />
          </Card>
        ) : null}

        {/* CHI C'E'. Prima si vedeva solo l'organizzatore e un conteggio: non
            bastava per decidere se andarci. */}
        {partecipanti.length > 0 ? (
          <Card style={styles.card} index={3}>
            <ThemedText type="subtitle">Chi c e</ThemedText>
            <View style={styles.facce}>
              {partecipanti.map((p) => (
                <PressableScale
                  key={p.id}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } } as never)}
                  style={styles.faccia}>
                  <Avatar name={p.nome} uri={p.fotoUrl ?? undefined} size={52} />
                  <ThemedText type="caption" numberOfLines={1} style={styles.nomeFaccia}>
                    {p.nome}
                  </ThemedText>
                  {p.eOrganizzatore ? (
                    <ThemedText type="caption" style={{ color: c.accent, fontSize: 10 }}>
                      organizza
                    </ThemedText>
                  ) : null}
                </PressableScale>
              ))}
            </View>
          </Card>
        ) : null}

        {/* La chat di gruppo si apre solo a chi c'e' davvero: e' il posto dove
            ci si mette d'accordo su chi porta cosa. */}
        {isHost || event.partecipo ? (
          <Button
            label="Chat del gruppo"
            variant="secondary"
            onPress={() => router.push({ pathname: '/chat/evento/[id]', params: { id: event.id } } as never)}
          />
        ) : null}

        {isHost ? (
          <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>
            Sei tu che organizzi.
          </ThemedText>
        ) : event.partecipo ? (
          <Button label="Non ci vado piu" variant="secondary" onPress={toggleJoin} loading={acting} />
        ) : pieno ? (
          <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>Posti esauriti.</ThemedText>
        ) : (
          <Button label={event.tipo === 'evento' ? 'Ci vado' : 'Partecipa'} onPress={toggleJoin} loading={acting} />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <ThemedText style={{ color: c.textSecondary }}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locandina: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14 },
  titoloRiga: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  etichettaTipo: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  facce: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xs },
  faccia: { alignItems: 'center', width: 64, gap: 2 },
  nomeFaccia: { textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowValue: { flex: 1, textAlign: 'right' },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
