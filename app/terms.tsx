import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SISTEMA } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { ETA_MINIMA } from '@/lib/age';

/**
 * Regole della community, termini e privacy.
 *
 * Esisteva l'obbligo di accettarle in onboarding ("Accetto le regole della
 * community") ma non esisteva un posto dove leggerle: si chiedeva alle persone
 * di firmare qualcosa di invisibile.
 *
 * ⚠️ IL TESTO STA IN `constants/testi/sistema.ts`, e non e' un dettaglio
 * organizzativo: qui il «noi» era piu' fitto che in qualunque altra schermata
 * («Non vendiamo alcolici», «Cosa raccogliamo», «Come li usiamo»), e in un
 * documento che stabilisce obblighi un «noi» evoca una societa' che non
 * esiste. Il soggetto adesso e' nominato.
 *
 * ATTENZIONE: è una stesura pensata per la beta chiusa, non un parere legale.
 * Prima di aprire al pubblico va fatta rivedere a un legale, soprattutto per le
 * normative su alcol e responsabilità in caso di incidenti.
 */
export default function TermsScreen() {
  const t = SISTEMA.regole;
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: t.titoloSchermata }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText type="label">{t.marchio}</ThemedText>
          <ThemedText type="title">{t.titolo}</ThemedText>
          <ThemedText style={styles.intro}>{t.intro}</ThemedText>
        </View>

        <Regola titolo={t.r1Titolo}>{t.r1}</Regola>
        <Regola titolo={t.r2Titolo}>{t.r2}</Regola>
        <Regola titolo={t.r3Titolo}>{t.r3(ETA_MINIMA)}</Regola>
        <Regola titolo={t.r4Titolo}>{t.r4}</Regola>
        <Regola titolo={t.r5Titolo}>{t.r5}</Regola>
        <Regola titolo={t.r6Titolo}>{t.r6}</Regola>
        <Regola titolo={t.r7Titolo}>{t.r7}</Regola>

        <View style={styles.section}>
          <ThemedText type="label">{t.privacyEtichetta}</ThemedText>
          <ThemedText type="title">{t.privacyTitolo}</ThemedText>
        </View>

        <Regola titolo={t.datiTitolo}>{t.dati}</Regola>
        <Regola titolo={t.chiVedeTitolo}>{t.chiVede}</Regola>
        <Regola titolo={t.usoTitolo}>{t.uso}</Regola>
        <Regola titolo={t.cancellazioneTitolo}>{t.cancellazione}</Regola>

        <Card>
          <ThemedText type="caption">{t.nota}</ThemedText>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

function Regola({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Card style={styles.regola}>
      <ThemedText type="defaultSemiBold">{titolo}</ThemedText>
      <ThemedText style={{ color: c.textSecondary, lineHeight: 22 }}>{children}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { marginTop: Spacing.xs, lineHeight: 22 },
  section: { marginTop: Spacing.md },
  regola: { gap: Spacing.xs },
});
