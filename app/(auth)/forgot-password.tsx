import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
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
      setError('Inserisci la tua email.');
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (resetError) {
        setError('Non siamo riusciti a inviare il reset.');
        return;
      }
      setMessage('Controlla la tua email. Il link ti porterà alla schermata per scegliere una nuova password.');
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
              <ThemedText type="title">Password dimenticata</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>Ti inviamo un link per reimpostarla.</ThemedText>
            </View>
            <ThemedText style={{ color: c.textSecondary }}>
              Se il tuo account esiste, riceverai un link che apre Beer to Beer direttamente sul cambio password.
            </ThemedText>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@esempio.it"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
            {message ? <ThemedText style={{ color: c.positive }}>{message}</ThemedText> : null}
            <Button label="Invia link" onPress={handleReset} loading={loading} />
            <Link href="/(auth)/login" replace style={styles.link}>
              <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
                Torna al login
              </ThemedText>
            </Link>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.md, gap: Spacing.md },
  header: { gap: Spacing.xs, marginBottom: Spacing.sm },
  link: { textAlign: 'center' },
});
