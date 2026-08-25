import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Impostazioni' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <ThemedText type="subtitle">Profilo e privacy</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>Gestisci foto, bio, preferenze e disponibilità sociale.</ThemedText>
          <Button label="Modifica profilo" variant="secondary" onPress={() => router.push('/edit-profile')} />
        </Card>
        <Card>
          <ThemedText type="subtitle">Sicurezza</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>Contatti fidati, connessioni e preferenze notifiche saranno raccolti qui.</ThemedText>
          {/* «Amici» sostituisce «Le mie connessioni» come porta d'ingresso:
              le connessioni erano un elenco implicito di chi avevi incrociato,
              gli amici sono un legame che le due persone hanno scelto. Chi
              conoscevi gia' resta, come suggerimento, dentro la schermata. */}
          <Button label="I miei amici" variant="secondary" onPress={() => router.push('/amici' as never)} />
        </Card>
        <Card>
          <ThemedText type="subtitle">Notifiche</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>Senza, non ti accorgi delle richieste: qui vedi se sono attive e le provi.</ThemedText>
          <Button label="Gestisci le notifiche" variant="secondary" onPress={() => router.push('/notification-settings' as never)} />
        </Card>
        <Card>
          <ThemedText type="subtitle">Regole e privacy</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>Come funzionano BeerCoin, moderazione e dati personali.</ThemedText>
          <Button label="Leggi le regole" variant="secondary" onPress={() => router.push('/terms' as never)} />
        </Card>
        <Button label="Esci" variant="danger" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl } });
