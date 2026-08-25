import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NOVITA } from '@/constants/novita';
import { Spacing } from '@/constants/theme';
import { VERSIONE } from '@/constants/versione';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';

/**
 * COS'È CAMBIATO.
 *
 * Il diario sta nel repository (`constants/novita.ts`), non nel messaggio di
 * `eas update`: così è versionato insieme alla modifica che descrive, e chi
 * tocca il codice non può dimenticarselo.
 *
 * In fondo, i due numeri di versione con la spiegazione di perché sono due.
 * Sembra un dettaglio da sviluppatori e non lo è: chi segnala un difetto deve
 * poter dire quale versione stava usando, e finora nell'app non c'era scritto
 * da nessuna parte.
 */
export default function NovitaScreen() {
  const c = useColors();
  const guscio = Constants.expoConfig?.version ?? 'sconosciuta';
  const aggiornata = Updates.createdAt ? formatShortDate(Updates.createdAt.toISOString()) : null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Cos’è cambiato' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="label" style={{ color: c.textSecondary }}>SEI ALLA</ThemedText>
        <ThemedText type="title">{VERSIONE}</ThemedText>

        {NOVITA.map((n) => (
          <View key={n.data} style={[styles.blocco, { backgroundColor: c.surface }]}>
            <ThemedText type="label" style={{ color: c.textSecondary }}>
              {formatShortDate(n.data)}
            </ThemedText>
            {n.righe.map((riga) => (
              <ThemedText key={riga} style={{ color: c.text }}>· {riga}</ThemedText>
            ))}
          </View>
        ))}

        <View style={[styles.blocco, { backgroundColor: c.surfaceAlt }]}>
          <ThemedText type="label" style={{ color: c.textSecondary }}>I DUE NUMERI</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            L’app che hai installato è la <ThemedText type="defaultSemiBold">{guscio}</ThemedText>, e
            cambia solo quando ne scarichi una nuova a mano. Il codice dentro è la{' '}
            <ThemedText type="defaultSemiBold">{VERSIONE}</ThemedText>, e arriva da solo quando
            riapri l’app{aggiornata ? `: l’ultima volta il ${aggiornata}` : ''}.
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            Se segnali qualcosa che non va, è il secondo numero quello che serve.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  blocco: { borderRadius: 12, padding: Spacing.md, gap: 6 },
});
