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
import { PAROLE, SISTEMA, VOCE } from '@/constants/testi';
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
  unsafe: SISTEMA.segnalazione.unsafe(PAROLE.giro),
  person_absent: SISTEMA.segnalazione.assente,
  request_mismatch: SISTEMA.segnalazione.mismatch(PAROLE.giro),
  comportamento_scorretto: 'Comportamento scorretto',
  ordine_falso: 'Ordine falso',
  molestie: 'Molestie',
  spam: 'Spam',
  sicurezza: SISTEMA.segnalazione.sicurezzaBreve,
  altro: SISTEMA.segnalazione.scambioBreve,
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
      toast.show(SISTEMA.segnalazione.inviata);
      await load();
      setTesto('');
    } catch (e) {
      Alert.alert(SISTEMA.segnalazione.nonInviata, messaggioServer(e, VOCE.riserva.riprovaFraPoco));
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
            title={SISTEMA.segnalazione.nonTrovataTitolo}
            message={SISTEMA.segnalazione.nonTrovataTesto}
            actionLabel={SISTEMA.segnalazione.tornaIndietro}
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
        <ThemedText type="title">{SISTEMA.segnalazione.titolo}</ThemedText>

        <Card style={[styles.card, { borderLeftColor: grave ? c.danger : c.accent, borderLeftWidth: 3 }]}>
          <ThemedText type="defaultSemiBold">
            {MOTIVI[segnalazione.motivoCodice ?? ''] ?? SISTEMA.segnalazione.scambioBreve}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
            {formatShortDate(segnalazione.creataIl)}
            {chiusa ? SISTEMA.segnalazione.giaChiusa : segnalazione.giaRisposto ? SISTEMA.segnalazione.inEsame : SISTEMA.segnalazione.inAttesa}
          </ThemedText>
        </Card>

        <ThemedText style={{ color: c.textSecondary }}>
          {chiusa
            ? SISTEMA.segnalazione.giaValutata
            : SISTEMA.segnalazione.spiegazione}
        </ThemedText>

        {segnalazione.miaDichiarazione ? (
          <Card style={styles.card}>
            <ThemedText type="label">{SISTEMA.segnalazione.laTuaVersione}</ThemedText>
            <ThemedText>{segnalazione.miaDichiarazione}</ThemedText>
          </Card>
        ) : null}

        {!chiusa && !segnalazione.giaRisposto ? (
          <>
            <TextInput
              value={testo}
              onChangeText={setTesto}
              placeholder={SISTEMA.segnalazione.segnaposto}
              placeholderTextColor={c.textSecondary}
              multiline
              style={[styles.campo, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            />
            <Button
              label={SISTEMA.segnalazione.manda}
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
