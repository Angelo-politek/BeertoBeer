import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ISSUES_URL, REPO_URL, SLOGAN } from '@/constants/branding';
import { VERSIONE_ESTESA } from '@/constants/versione';
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
          <ThemedText style={{ color: c.textSecondary }}>Chi hai bloccato, e le regole che valgono durante un giro.</ThemedText>
          {/* «Amici» sostituisce «Le mie connessioni» come porta d'ingresso:
              le connessioni erano un elenco implicito di chi avevi incrociato,
              gli amici sono un legame che le due persone hanno scelto. Chi
              conoscevi gia' resta, come suggerimento, dentro la schermata. */}
          <Button label="Persone bloccate" variant="secondary" onPress={() => router.push('/bloccati' as never)} />
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
        {/*
          IL CODICE E' DI TUTTI, e in un progetto che si dichiara open source
          questa non e' una card in piu': e' la prova. Finora l'unico posto in
          cui il progetto diceva di essere open source erano i termini — cioe'
          una promessa, non un link.
        */}
        <Card>
          <ThemedText type="label" style={{ color: c.accent }}>{SLOGAN.apertura}</ThemedText>
          <ThemedText type="subtitle">Il codice è di tutti</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            Beer to Beer è open source. Tutto quello che l’app fa, e tutto quello che il database
            sa di te, si può leggere: nessuno deve fidarsi sulla parola.
          </ThemedText>
          <Button label="Vedi il codice" variant="secondary" onPress={() => Linking.openURL(REPO_URL)} />
          <Button label="Segnala un problema" variant="secondary" onPress={() => Linking.openURL(ISSUES_URL)} />
          <ThemedText type="caption" style={{ color: c.textSecondary }}>
            Se non sai leggere il codice va benissimo lo stesso: scrivici da Profilo → Dicci cosa
            non va, che è la strada più corta.
          </ThemedText>
        </Card>

        {/*
          LA VERSIONE. Prima non compariva in nessun punto dell'app: chi
          segnalava un difetto non sapeva cosa stesse usando, e ogni feedback
          arrivava etichettato «V2.1» qualunque fosse la verita'.
        */}
        <Card>
          <ThemedText type="subtitle">{VERSIONE_ESTESA}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            App installata {Constants.expoConfig?.version ?? '—'}. Il codice si aggiorna da solo
            quando riapri.
          </ThemedText>
          <Button label="Cos’è cambiato" variant="secondary" onPress={() => router.push('/novita' as never)} />
        </Card>

        <Button label="Esci" variant="danger" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl } });
