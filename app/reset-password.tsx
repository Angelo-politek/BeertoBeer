import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
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
        setError('Il link di recupero non è più valido. Richiedi un nuovo reset.');
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
      setError('Il link di recupero non è più valido. Richiedi un nuovo reset.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Non siamo riusciti ad aggiornare la password.');
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
              <ThemedText type="title">Nuova password</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                Scegli una password nuova per completare il recupero del tuo account.
              </ThemedText>
            </View>

            {!session ? (
              <View style={styles.notice}>
                <ThemedText style={{ color: c.textSecondary }}>
                  Il link di recupero non è attivo. Richiedi un nuovo reset dalla schermata di accesso.
                </ThemedText>
                <Button label="Torna al login" onPress={handleBackToLogin} />
              </View>
            ) : success ? (
              <View style={styles.notice}>
                <ThemedText type="defaultSemiBold">Password aggiornata.</ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>
                  Ora puoi accedere con la nuova password.
                </ThemedText>
                <Button label="Vai al login" onPress={handleBackToLogin} />
              </View>
            ) : (
              <>
                <TextField
                  label="Nuova password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Almeno 6 caratteri"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TextField
                  label="Conferma password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Ripeti la nuova password"
                  secureTextEntry
                  autoCapitalize="none"
                />
                {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
                <Button label="Aggiorna password" onPress={handleUpdatePassword} loading={loading} />
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