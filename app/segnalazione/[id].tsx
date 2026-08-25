import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Radii, Spacing } from '@/constants/theme';
import { getMieSegnalazioni, rispondiASegnalazione, type MiaSegnalazione } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { formatShortDate } from '@/lib/format';

/**
 * «HAI RICEVUTO UNA SEGNALAZIONE. SCRIVI LA TUA VERSIONE.»
 *
 * Segnalazione del collaudo: «gli utenti segnalati devono ricevere un avviso
 * del tipo "ehy sei stato segnalato, comportati bene o ti facciamo fuori. Se
 * pensi si tratti di un errore puoi scrivere la tua versione dei fatti qui" e
 * lasciare la possibilita di scrivere un messaggio agli admin».
 *
 * Serve a due cose, e la seconda conta quanto la prima:
 *   1. chi ha sbagliato lo sa, e sa che qualcuno guarda;
 *   2. chi NON ha sbagliato puo' difendersi. Decidere sulla parola di uno solo
 *      e' il modo piu' rapido per punire la persona sbagliata, e le
 *      segnalazioni per ripicca esistono.
 *
 * COSA NON C'E' IN QUESTA SCHERMATA, di proposito: chi ha segnalato. Dirlo
 * invita alla ritorsione, ed e' il modo piu' sicuro per far smettere la gente
 * di segnalare quando si sente in pericolo.
 */

const MOTIVI: Record<string, string> = {
  unsafe: 'Qualcuno non si è sentito al sicuro durante un giro con te',
  person_absent: 'Qualcuno dice di non averti trovato',
  request_mismatch: 'Qualcuno dice che il giro non era quello concordato',
  comportamento_scorretto: 'Comportamento scorretto',
  ordine_falso: 'Ordine falso',
  molestie: 'Molestie',
  spam: 'Spam',
  sicurezza: 'Un problema di sicurezza',
  altro: 'Un problema durante uno scambio',
};

export default function SegnalazioneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [segnalazione, setSegnalazione] = useState<MiaSegnalazione | null>(null);
  const [loading, setLoading] = useState(true);
  const [testo, setTesto] = useState('');
  const [invio, setInvio] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tutte = await getMieSegnalazioni();
      setSegnalazione(tutte.find((s) => s.id === id) ?? null);
    } catch {
      setSegnalazione(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invia() {
    setInvio(true);
    try {
      await rispondiASegnalazione(id, testo.trim());
      toast.show('La tua versione è stata inviata.');
      await load();
      setTesto('');
    } catch (e) {
      Alert.alert('Non inviata', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setInvio(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Segnalazione' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!segnalazione) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Segnalazione' }} />
        <View style={styles.center}>
          <EmptyState
            title="Segnalazione non trovata"
            message="Può essere già stata chiusa, oppure il link non è più valido."
            actionLabel="Torna indietro"
            onAction={() => router.back()}
          />
        </View>
      </ThemedView>
    );
  }

  const grave = segnalazione.gravita === 'alta';
  const chiusa = segnalazione.stato === 'chiusa';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Segnalazione' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Hai ricevuto una segnalazione</ThemedText>

        <Card style={[styles.card, { borderLeftColor: grave ? c.danger : c.accent, borderLeftWidth: 3 }]}>
          <ThemedText type="defaultSemiBold">
            {MOTIVI[segnalazione.motivoCodice ?? ''] ?? 'Un problema durante uno scambio'}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
            {formatShortDate(segnalazione.creataIl)}
            {chiusa ? ' · già chiusa' : segnalazione.giaRisposto ? ' · in esame' : ' · in attesa della tua versione'}
          </ThemedText>
        </Card>

        <ThemedText style={{ color: c.textSecondary }}>
          {chiusa
            ? 'Questa segnalazione è stata già valutata. La tua versione resta agli atti.'
            : 'Prima di decidere qualsiasi cosa, chi modera legge tutte e due le versioni. Se pensi si tratti di un errore, questo è il posto per dirlo: scrivi cosa è successo dal tuo punto di vista.'}
        </ThemedText>

        {segnalazione.miaDichiarazione ? (
          <Card style={styles.card}>
            <ThemedText type="label">LA TUA VERSIONE</ThemedText>
            <ThemedText>{segnalazione.miaDichiarazione}</ThemedText>
          </Card>
        ) : null}

        {!chiusa && !segnalazione.giaRisposto ? (
          <>
            <TextInput
              value={testo}
              onChangeText={setTesto}
              placeholder="Cosa è successo, dal tuo punto di vista"
              placeholderTextColor={c.textSecondary}
              multiline
              style={[styles.campo, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            />
            <Button
              label="Manda agli amministratori"
              onPress={invia}
              loading={invio}
              disabled={testo.trim().length < 5}
            />
          </>
        ) : null}

        <ThemedText type="caption" style={{ color: c.textSecondary }}>
          Non ti diciamo chi ti ha segnalato: serve a proteggere chi si sente in pericolo. Quello che scrivi qui lo
          leggono solo gli amministratori.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { gap: Spacing.xs },
  campo: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 130,
    textAlignVertical: 'top',
    fontSize: 15,
  },
});
