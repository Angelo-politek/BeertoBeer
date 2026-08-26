import { Image } from 'expo-image';
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
import { INGRESSO } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { messaggioAuth } from '@/lib/auth-errors';
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
      setError(INGRESSO.accesso.campiVuoti);
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      // Prima qui c'era «Email o password non corretti» scritto a mano, per
      // OGNI causa di fallimento: chi non aveva ancora confermato l'email si
      // vedeva dire che la password era sbagliata, la cambiava, e falliva di
      // nuovo. `messaggioAuth` distingue i casi — ed esisteva già, usata dalle
      // altre tre schermate della soglia ma non da questa.
      setError(messaggioAuth(signInError, 'accesso'));
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
              <Animated.View entering={entraMarchio}>
                <Image
                  source={require('../../assets/brand/wordmark.png')}
                  style={styles.wordmark}
                  contentFit="contain"
                />
              </Animated.View>
              <Animated.View entering={entraInLista(1)} style={styles.headerText}>
                <ThemedText style={[styles.centered, { color: c.textSecondary }]}>
                  {INGRESSO.accesso.claim}
                </ThemedText>
              </Animated.View>
            </View>

            <Animated.View entering={entraInLista(2)} style={styles.form}>
              <TextField
                label={INGRESSO.accesso.email}
                value={email}
                onChangeText={setEmail}
                placeholder={INGRESSO.accesso.emailSegnaposto}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label={INGRESSO.accesso.password}
                value={password}
                onChangeText={setPassword}
                placeholder={INGRESSO.accesso.passwordSegnaposto}
                secureTextEntry
                autoCapitalize="none"
              />

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: c.dangerSoft }]}>
                  <ThemedText style={{ color: c.danger, fontSize: 14 }}>{error}</ThemedText>
                </View>
              ) : null}

              <Button label={INGRESSO.accesso.entra} onPress={handleLogin} loading={loading} />

              <Link href="/(auth)/forgot-password" style={styles.centerLink}>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong, fontSize: 14 }}>
                  {INGRESSO.accesso.dimenticata}
                </ThemedText>
              </Link>
            </Animated.View>

            <View style={styles.footer}>
              <ThemedText style={{ color: c.textSecondary }}>{`${INGRESSO.accesso.senzaAccount} `}</ThemedText>
              <Link href="/(auth)/register" replace>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
                  {INGRESSO.accesso.registrati}
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
