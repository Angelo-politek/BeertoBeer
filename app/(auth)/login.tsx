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

export default function LoginScreen() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError('Email o password non corretti.');
      return;
    }
    // Il redirect alle (tabs) avviene automaticamente dal guard nel root layout.
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="title">Bentornato 🍺</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                Accedi per continuare a scambiare birre.
              </ThemedText>
            </View>

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@esempio.it"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}

            <Button label="Accedi" onPress={handleLogin} loading={loading} />

            <Link href="/(auth)/forgot-password">
              <ThemedText type="defaultSemiBold" style={{ color: c.accent, textAlign: 'center' }}>
                Password dimenticata?
              </ThemedText>
            </Link>

            <View style={styles.footer}>
              <ThemedText style={{ color: c.textSecondary }}>Non hai un account? </ThemedText>
              <Link href="/(auth)/register" replace>
                <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
                  Registrati
                </ThemedText>
              </Link>
            </View>
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});
