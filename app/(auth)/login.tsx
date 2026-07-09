import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
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
              <Animated.View entering={ZoomIn.springify().damping(14).stiffness(200)}>
                <Image
                  source={require('../../assets/brand/wordmark.png')}
                  style={styles.wordmark}
                  contentFit="contain"
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(100).springify().damping(20).stiffness(180)} style={styles.headerText}>
                <ThemedText style={[styles.centered, { color: c.textSecondary }]}>
                  Ti manca una birra? Accedi.
                </ThemedText>
              </Animated.View>
            </View>

            <Animated.View entering={FadeInDown.delay(180).springify().damping(20).stiffness(180)} style={styles.form}>
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

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: c.dangerSoft }]}>
                  <ThemedText style={{ color: c.danger, fontSize: 14 }}>{error}</ThemedText>
                </View>
              ) : null}

              <Button label="Accedi" onPress={handleLogin} loading={loading} />

              <Link href="/(auth)/forgot-password" style={styles.centerLink}>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong, fontSize: 14 }}>
                  Password dimenticata?
                </ThemedText>
              </Link>
            </Animated.View>

            <View style={styles.footer}>
              <ThemedText style={{ color: c.textSecondary }}>Non hai un account? </ThemedText>
              <Link href="/(auth)/register" replace>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
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
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: { gap: Spacing.xs },
  wordmark: {
    width: 240,
    height: 150,
  },
  centered: { textAlign: 'center' },
  form: { gap: Spacing.md },
  errorBanner: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  centerLink: { textAlign: 'center', marginTop: Spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
