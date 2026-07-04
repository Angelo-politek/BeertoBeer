import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useToast } from '@/components/toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEventById, joinEvent, leaveEvent } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
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

  const [event, setEvent] = useState<BeerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvent(await getEventById(id));
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
        toast.show('Hai abbandonato il giro');
      } else {
        await joinEvent(event.id);
        toast.show('Ci sei! 🍻');
      }
      await load();
    } catch {
      Alert.alert('Errore', 'Operazione non riuscita. Riprova.');
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
  const pieno = (event.partecipanti ?? 0) >= event.posti;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: event.titolo }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">🍻 {event.titolo}</ThemedText>

        <Card style={styles.card} index={0}>
          <Row label="🗓 Quando" value={formatDateTime(event.quando)} />
          {event.luogo ? <Row label="📍 Dove" value={event.luogo} /> : null}
          <Row label="👥 Posti" value={`${event.partecipanti ?? 0} / ${event.posti}`} />
        </Card>

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

        {isHost ? (
          <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>
            Sei l&apos;organizzatore di questo giro.
          </ThemedText>
        ) : event.partecipo ? (
          <Button label="Abbandona il giro" variant="danger" onPress={toggleJoin} loading={acting} />
        ) : pieno ? (
          <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>Giro al completo.</ThemedText>
        ) : (
          <Button label="Unisciti al giro 🍺" onPress={toggleJoin} loading={acting} />
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
