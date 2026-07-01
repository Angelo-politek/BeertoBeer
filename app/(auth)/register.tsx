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
import { computeAge, parseBirthdate, toISODate } from '@/lib/age';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const c = useColors();
  const [nome, setNome] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!nome.trim()) {
      setError('Inserisci il tuo nome.');
      return;
    }

    const birth = parseBirthdate(birthdate);
    if (!birth) {
      setError('Data di nascita non valida. Usa il formato GG/MM/AAAA.');
      return;
    }
    if (computeAge(birth) < 18) {
      setError('Devi avere almeno 18 anni per usare Beer to Beer.');
      return;
    }

    if (!email.trim()) {
      setError('Inserisci la tua email.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Letti dal trigger handle_new_user() per creare la riga in public.users.
        data: {
          nome: nome.trim(),
          data_nascita: toISODate(birth),
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // Conferma email disattivata → si è subito loggati. Il redirect avviene dal guard.
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="title">Crea il tuo account</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                Devi avere almeno 18 anni per partecipare.
              </ThemedText>
            </View>

            <TextField
              label="Nome"
              value={nome}
              onChangeText={setNome}
              placeholder="Come ti chiami?"
              autoCapitalize="words"
            />
            <TextField
              label="Data di nascita"
              value={birthdate}
              onChangeText={setBirthdate}
              placeholder="GG/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
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
              placeholder="Almeno 6 caratteri"
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}

            <Button label="Registrati" onPress={handleRegister} loading={loading} />

            <View style={styles.footer}>
              <ThemedText style={{ color: c.textSecondary }}>Hai già un account? </ThemedText>
              <Link href="/(auth)/login" replace>
                <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
                  Accedi
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
