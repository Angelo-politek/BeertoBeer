import * as Notifications from 'expo-notifications';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { sendTestPush } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { registerForPushNotifications } from '@/lib/push-notifications';

type Stato = 'sconosciuto' | 'attive' | 'da-attivare' | 'bloccate';

/**
 * Impostazioni notifiche.
 *
 * Senza notifiche Beer to Beer non funziona: chi apre l'app a caso non trova
 * quasi mai una richiesta aperta, e il feed sembra morto. Ma finora l'unico
 * segnale era un avviso generico che compariva anche quando il problema era
 * un'altra cosa (rete giù, database irraggiungibile), lasciando l'utente senza
 * capire cosa fare. Qui lo stato è dichiarato, e c'è un modo per provarlo
 * davvero invece di sperare.
 */
export default function NotificationSettingsScreen() {
  const c = useColors();
  const toast = useToast();
  const [stato, setStato] = useState<Stato>('sconosciuto');
  const [inCorso, setInCorso] = useState(false);

  const leggiStato = useCallback(async () => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (perm.granted) setStato('attive');
      // canAskAgain false = l'utente ha detto no e il sistema non lo richiederà
      // più: da qui l'unica strada sono le impostazioni di Android.
      else if (perm.canAskAgain) setStato('da-attivare');
      else setStato('bloccate');
    } catch {
      setStato('sconosciuto');
    }
  }, []);

  useFocusEffect(useCallback(() => { leggiStato(); }, [leggiStato]));

  async function attiva() {
    setInCorso(true);
    const esito = await registerForPushNotifications();
    setInCorso(false);
    await leggiStato();

    if (esito.ok) {
      toast.show('Notifiche attivate su questo telefono.');
      return;
    }
    if (esito.motivo === 'permesso-negato') {
      toast.show('Permesso negato: puoi concederlo dalle impostazioni di Android.', 'error');
      return;
    }
    if (esito.motivo === 'configurazione') {
      toast.show('Questa build non è configurata per le notifiche. Serve una build nuova.', 'error');
      return;
    }
    toast.show(esito.dettaglio ?? 'Non è stato possibile registrare questo telefono.', 'error');
  }

  async function prova() {
    setInCorso(true);
    try {
      await sendTestPush();
      toast.show('Inviata: dovrebbe arrivarti entro qualche secondo.');
    } catch (e) {
      toast.show((e as { message?: string })?.message ?? 'Invio non riuscito.', 'error');
    } finally {
      setInCorso(false);
    }
  }

  const descrizione: Record<Stato, string> = {
    attive: 'Questo telefono è registrato: riceverai le notifiche.',
    'da-attivare': 'Non sono ancora attive. Bastano due tocchi.',
    bloccate: 'Le hai rifiutate in passato. Android non le richiederà più: vanno riattivate dalle impostazioni di sistema.',
    sconosciuto: 'Non riesco a leggere lo stato delle notifiche su questo telefono.',
  };

  const colore = stato === 'attive' ? c.positive : stato === 'sconosciuto' ? c.textSecondary : c.danger;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Notifiche' }} />
      <View style={styles.content}>
        <Card style={styles.card}>
          <ThemedText type="label">STATO</ThemedText>
          <ThemedText type="subtitle" style={{ color: colore }}>
            {stato === 'attive' ? 'Attive' : stato === 'bloccate' ? 'Bloccate da Android' : stato === 'da-attivare' ? 'Non attive' : 'Non determinato'}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{descrizione[stato]}</ThemedText>

          {stato === 'attive' ? (
            <Button label="Mandami una notifica di prova" variant="secondary" onPress={prova} loading={inCorso} />
          ) : stato === 'bloccate' ? (
            <Button label="Apri le impostazioni di Android" variant="secondary" onPress={() => Linking.openSettings()} />
          ) : (
            <Button label="Attiva le notifiche" onPress={attiva} loading={inCorso} />
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="defaultSemiBold">Cosa ti arriva</ThemedText>
          {[
            'Una nuova richiesta di birre nella tua città',
            'Quando qualcuno accetta il tuo giro',
            'I messaggi in chat',
            'Quando è il momento di confermare lo scambio',
            'Quando chi hai invitato completa il suo primo giro',
          ].map((riga) => (
            <ThemedText key={riga} style={{ color: c.textSecondary }}>
              · {riga}
            </ThemedText>
          ))}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="defaultSemiBold">Perché contano</ThemedText>
          <ThemedText style={{ color: c.textSecondary, lineHeight: 22 }}>
            Le richieste durano poche ore. Senza notifiche te ne accorgi solo se apri l&apos;app nel
            momento giusto, e il feed ti sembrerà quasi sempre vuoto — anche quando la città si sta
            muovendo.
          </ThemedText>
        </Card>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { gap: Spacing.sm },
});
