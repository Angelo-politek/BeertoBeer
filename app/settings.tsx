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
import { SISTEMA } from '@/constants/testi';
import { useColors } from '@/hooks/use-colors';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: SISTEMA.impostazioni.titolo }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <ThemedText type="subtitle">{SISTEMA.impostazioni.profiloTitolo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{SISTEMA.impostazioni.profiloTesto}</ThemedText>
          <Button label={SISTEMA.impostazioni.modificaProfilo} variant="secondary" onPress={() => router.push('/edit-profile')} />
        </Card>
        <Card>
          <ThemedText type="subtitle">{SISTEMA.impostazioni.sicurezzaTitolo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{SISTEMA.impostazioni.sicurezzaTesto}</ThemedText>
          {/* «Amici» sostituisce «Le mie connessioni» come porta d'ingresso:
              le connessioni erano un elenco implicito di chi avevi incrociato,
              gli amici sono un legame che le due persone hanno scelto. Chi
              conoscevi gia' resta, come suggerimento, dentro la schermata. */}
          <Button label={SISTEMA.impostazioni.bloccate} variant="secondary" onPress={() => router.push('/bloccati' as never)} />
        </Card>
        <Card>
          <ThemedText type="subtitle">{SISTEMA.impostazioni.notificheTitolo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{SISTEMA.impostazioni.notificheTesto}</ThemedText>
          <Button label={SISTEMA.impostazioni.gestisciNotifiche} variant="secondary" onPress={() => router.push('/notification-settings' as never)} />
        </Card>
        <Card>
          <ThemedText type="subtitle">{SISTEMA.impostazioni.regoleTitolo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{SISTEMA.impostazioni.regoleTesto}</ThemedText>
          <Button label={SISTEMA.impostazioni.leggiRegole} variant="secondary" onPress={() => router.push('/terms' as never)} />
        </Card>
        {/*
          IL CODICE E' DI TUTTI, e in un progetto che si dichiara open source
          questa non e' una card in piu': e' la prova. Finora l'unico posto in
          cui il progetto diceva di essere open source erano i termini — cioe'
          una promessa, non un link.
        */}
        <Card>
          <ThemedText type="label" style={{ color: c.accent }}>{SLOGAN.apertura}</ThemedText>
          <ThemedText type="subtitle">{SISTEMA.impostazioni.codiceTitolo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            Beer to Beer è open source. Tutto quello che l’app fa, e tutto quello che il database
            sa di te, si può leggere: nessuno deve fidarsi sulla parola.
          </ThemedText>
          <Button label={SISTEMA.impostazioni.vediCodice} variant="secondary" onPress={() => Linking.openURL(REPO_URL)} />
          <Button label={SISTEMA.impostazioni.segnalaProblema} variant="secondary" onPress={() => Linking.openURL(ISSUES_URL)} />
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
          <Button label={SISTEMA.impostazioni.cosaCambiato} variant="secondary" onPress={() => router.push('/novita' as never)} />
        </Card>

        <Button label={SISTEMA.impostazioni.esci} variant="danger" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl } });
