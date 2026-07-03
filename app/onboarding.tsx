import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export default function OnboardingScreen() {
  const c = useColors();
  const router = useRouter();
  const [over18, setOver18] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const canContinue = over18 && acceptedRules;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <ThemedText style={styles.icon}>🍺</ThemedText>
            <ThemedText type="title" style={styles.title}>
              Benvenuto su Beer to Beer
            </ThemedText>
            <ThemedText style={[styles.copy, { color: c.textSecondary }]}>
              Pubblica una richiesta, accetta una consegna nelle vicinanze e chiudi lo scambio con crediti e recensioni.
            </ThemedText>
          </View>
          <View style={styles.steps}>
            <Step n="1" title="Richiedi" text="Scegli birre, indirizzo e fascia oraria." />
            <Step n="2" title="Consegna" text="Un altro utente accetta e vi coordinate in chat." />
            <Step n="3" title="Conferma" text="Entrambi confermate e lasciate una recensione." />
          </View>
          <View style={styles.checklist}>
            <ToggleRow
              checked={over18}
              onPress={() => setOver18((value) => !value)}
              title="Dichiaro di avere almeno 18 anni"
              subtitle="Beer to Beer è riservato a utenti maggiorenni."
            />
            <ToggleRow
              checked={acceptedRules}
              onPress={() => setAcceptedRules((value) => !value)}
              title="Accetto le regole della community"
              subtitle="Uso responsabile, niente vendita di alcol e rispetto della moderazione."
            />
          </View>
          <Button label="Entra nell'app" onPress={() => router.replace('/(tabs)')} disabled={!canContinue} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  const c = useColors();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: c.accentSoft }]}>
        <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
          {n}
        </ThemedText>
      </View>
      <View style={styles.stepText}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={{ color: c.textSecondary }}>{text}</ThemedText>
      </View>
    </View>
  );
}

function ToggleRow({
  checked,
  onPress,
  title,
  subtitle,
}: {
  checked: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
}) {
  const c = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggleRow,
        {
          borderColor: checked ? c.accent : c.border,
          backgroundColor: checked ? c.accentSoft : c.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.checkbox, { borderColor: checked ? c.accent : c.border, backgroundColor: checked ? c.accent : 'transparent' }]}>
        {checked ? <View style={[styles.checkboxDot, { backgroundColor: c.accentText }]} /> : null}
      </View>
      <View style={styles.toggleText}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={{ color: c.textSecondary }}>{subtitle}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.md, gap: Spacing.lg },
  hero: { alignItems: 'center', gap: Spacing.sm },
  icon: { fontSize: 64 },
  title: { textAlign: 'center' },
  copy: { textAlign: 'center', lineHeight: 22 },
  steps: { gap: Spacing.md },
  step: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  stepNumber: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: 2 },
  checklist: { gap: Spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleText: { flex: 1, gap: 2 },
});
