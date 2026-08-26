import * as Notifications from 'expo-notifications';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { sendTestPush } from '@/data/api';
import { SISTEMA } from '@/constants/testi';
import { messaggioServer } from '@/lib/errori';
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
      toast.show(SISTEMA.notificheImpostazioni.attivate);
      return;
    }
    if (esito.motivo === 'permesso-negato') {
      toast.show(SISTEMA.notificheImpostazioni.permessoNegato, 'error');
      return;
    }
    if (esito.motivo === 'configurazione') {
      toast.show(SISTEMA.notificheImpostazioni.buildSenzaNotifiche, 'error');
      return;
    }
    toast.show(esito.dettaglio ?? SISTEMA.notificheImpostazioni.nonRegistrato, 'error');
  }

  async function prova() {
    setInCorso(true);
    try {
      await sendTestPush();
      toast.show('Inviata: dovrebbe arrivarti entro qualche secondo.');
    } catch (e) {
      toast.show(messaggioServer(e, SISTEMA.notificheImpostazioni.provaNonRiuscita), 'error');
    } finally {
      setInCorso(false);
    }
  }

  const descrizione: Record<Stato, string> = {
    attive: SISTEMA.notificheImpostazioni.attive,
    'da-attivare': SISTEMA.notificheImpostazioni.nonAncoraAttive,
    bloccate: SISTEMA.notificheImpostazioni.rifiutate,
    sconosciuto: SISTEMA.notificheImpostazioni.statoIgnoto,
  };

  const colore = stato === 'attive' ? c.positive : stato === 'sconosciuto' ? c.textSecondary : c.danger;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Notifiche' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <ThemedText type="label">{SISTEMA.notificheImpostazioni.statoEtichetta}</ThemedText>
          <ThemedText type="subtitle" style={{ color: colore }}>
            {stato === 'attive' ? SISTEMA.notificheImpostazioni.statoAttive : stato === 'bloccate' ? SISTEMA.notificheImpostazioni.statoBloccate : stato === 'da-attivare' ? SISTEMA.notificheImpostazioni.nonAttive : SISTEMA.notificheImpostazioni.nonDeterminato}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{descrizione[stato]}</ThemedText>

          {stato === 'attive' ? (
            <Button label={SISTEMA.notificheImpostazioni.prova} variant="secondary" onPress={prova} loading={inCorso} />
          ) : stato === 'bloccate' ? (
            <Button label={SISTEMA.notificheImpostazioni.apriImpostazioni} variant="secondary" onPress={() => Linking.openSettings()} />
          ) : (
            <Button label={SISTEMA.notificheImpostazioni.attiva} onPress={attiva} loading={inCorso} />
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="defaultSemiBold">{SISTEMA.notificheImpostazioni.cosaTiArriva}</ThemedText>
          {[
            ...SISTEMA.notificheImpostazioni.elenco,
          ].map((riga) => (
            <ThemedText key={riga} style={{ color: c.textSecondary }}>
              · {riga}
            </ThemedText>
          ))}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="defaultSemiBold">{SISTEMA.notificheImpostazioni.percheContano}</ThemedText>
          <ThemedText style={{ color: c.textSecondary, lineHeight: 22 }}>
            {SISTEMA.notificheImpostazioni.percheContanoTesto}
          </ThemedText>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.sm },
});
