import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { INGRESSO, VOCE } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { messaggioAuth } from '@/lib/auth-errors';
import { useSession } from '@/lib/auth-context';
import { PASSWORD_MINIMA } from '@/lib/limiti';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { session, loading: sessionLoading } = useSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveRecovery() {
      const code = typeof params.code === 'string' ? params.code : undefined;
      if (!code || session) {
        if (active) setRecovering(false);
        return;
      }

      setRecovering(true);
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;

      if (exchangeError) {
        setError(INGRESSO.nuovaPassword.linkScaduto);
      }
      setRecovering(false);
    }

    void resolveRecovery();

    return () => {
      active = false;
    };
  }, [params.code, session]);

  async function handleUpdatePassword() {
    setError(null);

    if (!session) {
      setError(INGRESSO.nuovaPassword.linkScaduto);
      return;
    }
    if (password.length < PASSWORD_MINIMA) {
      setError(INGRESSO.nuovaPassword.passwordCorta(PASSWORD_MINIMA));
      return;
    }
    if (password !== confirmPassword) {
      setError(INGRESSO.nuovaPassword.nonCoincidono);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        // Prima qui c'era «Non siamo riusciti ad aggiornare la password»: un
        // «noi» che evoca una società inesistente, e per giunta al posto del
        // motivo vero. Se il server dice che la password è troppo debole o che
        // la sessione è scaduta, quella frase lo nascondeva.
        setError(messaggioAuth(updateError, 'accesso'));
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  }

  async function handleBackToLogin() {
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/(auth)/login');
  }

  if (sessionLoading || recovering) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} size="large" />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="title">{INGRESSO.nuovaPassword.titolo}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                {INGRESSO.nuovaPassword.spiegazione}
              </ThemedText>
            </View>

            {!session ? (
              <View style={styles.notice}>
                <ThemedText style={{ color: c.textSecondary }}>
                  {INGRESSO.nuovaPassword.linkNonAttivo}
                </ThemedText>
                <Button label={VOCE.azione.tornaAllAccesso} onPress={handleBackToLogin} />
              </View>
            ) : success ? (
              <View style={styles.notice}>
                <ThemedText type="defaultSemiBold">{INGRESSO.nuovaPassword.fatta}</ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>
                  {INGRESSO.nuovaPassword.fattaTesto}
                </ThemedText>
                <Button label={VOCE.azione.tornaAllAccesso} onPress={handleBackToLogin} />
              </View>
            ) : (
              <>
                <TextField
                  label={INGRESSO.nuovaPassword.nuova}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={INGRESSO.nuovaPassword.nuovaSegnaposto(PASSWORD_MINIMA)}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TextField
                  label={INGRESSO.nuovaPassword.conferma}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={INGRESSO.nuovaPassword.confermaSegnaposto}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
                <Button label={INGRESSO.nuovaPassword.aggiorna} onPress={handleUpdatePassword} loading={loading} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.md, gap: Spacing.md },
  header: { gap: Spacing.xs, marginBottom: Spacing.sm },
  notice: { gap: Spacing.md },
});