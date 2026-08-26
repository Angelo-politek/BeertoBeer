import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { entraInLista, entraMarchio } from '@/constants/motion';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon } from '@/components/ui/brand-icon';
import { INGRESSO, VOCE } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { messaggioAuth } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = Linking.createURL('/reset-password');

  async function handleReset() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError(INGRESSO.passwordDimenticata.emailMancante);
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (resetError) {
        setError(messaggioAuth(resetError, 'accesso'));
        return;
      }
      setMessage(INGRESSO.passwordDimenticata.inviata);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Animated.View
                entering={entraMarchio}
                style={[styles.logoCircle, { backgroundColor: c.accentSoft }]}>
                <BrandIcon name="cap" size={38} color={c.accent} />
              </Animated.View>
              <Animated.View entering={entraInLista(1)} style={styles.headerText}>
                <ThemedText type="title" style={styles.centered}>
                  {INGRESSO.passwordDimenticata.titolo}
                </ThemedText>
                <ThemedText style={[styles.centered, { color: c.textSecondary }]}>
                  {INGRESSO.passwordDimenticata.spiegazione}
                </ThemedText>
              </Animated.View>
            </View>

            <Animated.View entering={entraInLista(2)} style={styles.form}>
              <TextField
                label={INGRESSO.passwordDimenticata.email}
                value={email}
                onChangeText={setEmail}
                placeholder={INGRESSO.passwordDimenticata.emailSegnaposto}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {error ? (
                <View style={[styles.banner, { backgroundColor: c.dangerSoft }]}>
                  <ThemedText style={{ color: c.danger, fontSize: 14 }}>{error}</ThemedText>
                </View>
              ) : null}
              {message ? (
                <View style={[styles.banner, { backgroundColor: c.positiveSoft }]}>
                  <ThemedText style={{ color: c.positive, fontSize: 14 }}>{message}</ThemedText>
                </View>
              ) : null}
              <Button label={INGRESSO.passwordDimenticata.invia} onPress={handleReset} loading={loading} />
              <Link href="/(auth)/login" replace style={styles.centerLink}>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong, fontSize: 14 }}>
                  {VOCE.azione.tornaAllAccesso}
                </ThemedText>
              </Link>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.lg },
  header: { alignItems: 'center', gap: Spacing.md },
  headerText: { gap: Spacing.xs },
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 48, lineHeight: 62 },
  centered: { textAlign: 'center' },
  form: { gap: Spacing.md },
  banner: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  centerLink: { textAlign: 'center', marginTop: Spacing.xs },
});
