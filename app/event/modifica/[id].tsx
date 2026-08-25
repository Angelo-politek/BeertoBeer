import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { getEventById, modificaIncontro } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { messaggioServer } from '@/lib/errori';
import type { BeerEvent } from '@/types';

/**
 * CORREGGERE UN INCONTRO.
 *
 * Finora l'unica strada per un'ora sbagliata o un refuso nel titolo era
 * annullare e rifare — e rifare significa che chi si era iscritto deve
 * iscriversi di nuovo, cioè quasi sempre non lo fa.
 *
 * IL LUOGO NON SI TOCCA DA QUI, di proposito. Spostare un incontro a cui la
 * gente si è già iscritta non è una correzione: è disdire e rifare, e va detto
 * apertamente invece che fatto di nascosto con un campo di testo. Chi deve
 * cambiare posto annulla e ne propone un altro, così chi partecipava riceve un
 * avviso e decide di nuovo.
 *
 * Quando cambiano l'ora o il titolo, chi partecipa viene avvisato: un cambio
 * d'orario che nessuno legge è peggio dell'orario sbagliato.
 */
export default function ModificaIncontroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();

  const [event, setEvent] = useState<BeerEvent | null>(null);
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [posti, setPosti] = useState('6');
  const [oraDelta, setOraDelta] = useState<number | null>(null);
  const [caricando, setCaricando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    try {
      const e = await getEventById(id);
      setEvent(e);
      if (e) {
        setTitolo(e.titolo);
        setDescrizione(e.descrizione ?? '');
        setPosti(String(e.posti));
      }
    } catch {
      setEvent(null);
    } finally {
      setCaricando(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (caricando) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Modifica' }} />
        <View style={styles.center}><ActivityIndicator color={c.accent} /></View>
      </ThemedView>
    );
  }

  if (!event || event.hostId !== session?.user.id) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Modifica' }} />
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger, textAlign: 'center' }}>
            Puoi modificare solo gli incontri che hai proposto tu.
          </ThemedText>
          <Button label="Torna indietro" variant="secondary" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  const quandoAttuale = new Date(event.quando);
  const quandoNuovo =
    oraDelta == null ? quandoAttuale : new Date(quandoAttuale.getTime() + oraDelta * 3_600_000);

  async function salva() {
    if (!event) return;
    setSalvando(true);
    try {
      await modificaIncontro({
        id: event.id,
        titolo,
        descrizione: descrizione.trim() || undefined,
        quando: oraDelta == null ? undefined : quandoNuovo.toISOString(),
        posti: Number(posti) || undefined,
      });
      toast.show('Salvato. Chi partecipa è stato avvisato.');
      router.back();
    } catch (e) {
      Alert.alert('Non salvato', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: event.tipo === 'evento' ? 'Modifica l’evento' : 'Modifica l’incontro' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <ThemedText type="label">COME SI CHIAMA</ThemedText>
          <TextField label="Titolo" value={titolo} onChangeText={setTitolo} placeholder="Due birre al parco" />
          <TextField
            label="Dettagli"
            value={descrizione}
            onChangeText={setDescrizione}
            placeholder="Cosa portare, dove trovarsi di preciso…"
            multiline
          />
        </Card>

        <Card style={styles.card}>
          <ThemedText type="label">QUANDO</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            {quandoNuovo.toLocaleString('it-IT', {
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
            })}
          </ThemedText>
          {/* Spostamenti relativi invece di un selettore di data: nove volte su
              dieci si sposta di mezz'ora o di un'ora, e un selettore completo
              e' quattro tocchi per lo stesso risultato. */}
          <View style={styles.chip}>
            {[-2, -1, -0.5, 0.5, 1, 2].map((d) => (
              <Chip
                key={d}
                label={`${d > 0 ? '+' : ''}${d === 0.5 ? '30 min' : d === -0.5 ? '-30 min' : `${d} h`}`}
                active={oraDelta === d}
                onPress={() => setOraDelta(oraDelta === d ? null : d)}
              />
            ))}
          </View>
          {oraDelta != null ? (
            <ThemedText type="caption" style={{ color: c.accent }}>
              Chi si è iscritto riceve un avviso.
            </ThemedText>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="label">POSTI</ThemedText>
          <TextField label="Quanti" value={posti} onChangeText={setPosti} keyboardType="number-pad" />
          <ThemedText type="caption" style={{ color: c.textSecondary }}>
            Non puoi scendere sotto chi si è già iscritto: sarebbe cacciare qualcuno che aveva già
            detto di venire.
          </ThemedText>
        </Card>

        <Card style={styles.card}>
          <ThemedText type="label">IL POSTO NON SI CAMBIA DA QUI</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            Spostare un incontro a cui la gente si è già iscritta non è una correzione: è disdire e
            rifare. Annullalo e proponine un altro, così chi partecipava decide di nuovo.
          </ThemedText>
        </Card>

        <Button label="Salva" loading={salvando} disabled={titolo.trim().length < 3} onPress={salva} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md, gap: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.sm },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
