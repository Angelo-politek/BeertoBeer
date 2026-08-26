import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { entra, entraInLista } from '@/constants/motion';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthdateField } from '@/components/birthdate-field';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { INGRESSO } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { checkInviteCode } from '@/data/api';
import { computeAge, ETA_MINIMA, parseBirthdate, toISODate } from '@/lib/age';
import { messaggioAuth } from '@/lib/auth-errors';
import { PASSWORD_MINIMA } from '@/lib/limiti';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const c = useColors();
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // In Beer to Beer si entra solo su invito. Il codice può arrivare da un link
  // (beertobeer://register?invito=...) e in quel caso il campo è già compilato.
  const { invito: invitoDalLink } = useLocalSearchParams<{ invito?: string }>();
  const [invito, setInvito] = useState('');
  const [invitoOk, setInvitoOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invitoDalLink) setInvito(invitoDalLink.toUpperCase());
  }, [invitoDalLink]);

  /** Verifica il codice appena l'utente finisce di scriverlo, non alla fine. */
  async function verificaInvito() {
    const code = invito.trim();
    if (code.length < 6) {
      setInvitoOk(null);
      return;
    }
    setInvitoOk(await checkInviteCode(code));
  }

  async function handleRegister() {
    setError(null);

    if (!nome.trim()) {
      setError(INGRESSO.registrazione.nomeMancante);
      return;
    }

    const birth = parseBirthdate(birthdate);
    if (!birth) {
      setError(INGRESSO.registrazione.dataNonValida);
      return;
    }
    if (computeAge(birth) < ETA_MINIMA) {
      setError(INGRESSO.registrazione.troppoGiovane(ETA_MINIMA));
      return;
    }

    if (!email.trim()) {
      setError(INGRESSO.registrazione.emailMancante);
      return;
    }
    if (password.length < PASSWORD_MINIMA) {
      setError(INGRESSO.registrazione.passwordCorta(PASSWORD_MINIMA));
      return;
    }
    if (!invito.trim()) {
      setError(INGRESSO.registrazione.invito.mancante);
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Dove torna il link di conferma email. Punta a una schermata dentro il
        // gruppo (auth): fuori di lì il guardiano delle rotte la chiuderebbe
        // prima che il codice venga scambiato.
        emailRedirectTo: Linking.createURL('/auth-callback'),
        // Letti dal trigger handle_new_user() per creare la riga in public.users.
        data: {
          nome: nome.trim(),
          data_nascita: toISODate(birth),
          // Il cancello vero è lato server (handle_new_user): se l'invito non
          // è valido la registrazione viene annullata per intero.
          invito: invito.trim().toUpperCase(),
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(messaggioAuth(signUpError, 'registrazione'));
      return;
    }

    if (data.session) {
      // Email confirmation disattivata: sessione subito attiva → onboarding.
      router.replace('/onboarding' as never);
      return;
    }

    // Email confirmation attiva: senza sessione il guard in _layout riporterebbe
    // al login prima che l'onboarding sia visibile. Avvisiamo e portiamo al login.
    Alert.alert(
      INGRESSO.registrazione.confermaTitolo,
      INGRESSO.registrazione.confermaTesto(email.trim()),
    );
    router.replace('/(auth)/login');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View entering={entra} style={styles.header}>
              <ThemedText type="label">{INGRESSO.registrazione.occhiello}</ThemedText>
              <ThemedText type="title">{INGRESSO.registrazione.titolo}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                {INGRESSO.registrazione.eta(ETA_MINIMA)}
              </ThemedText>
            </Animated.View>

            <Animated.View entering={entraInLista(1)} style={styles.form}>
              <TextField
                label={INGRESSO.registrazione.nome}
                value={nome}
                onChangeText={setNome}
                placeholder={INGRESSO.registrazione.nomeSegnaposto}
                autoCapitalize="words"
              />
              <BirthdateField value={birthdate} onChangeText={setBirthdate} />
              <TextField
                label={INGRESSO.registrazione.email}
                value={email}
                onChangeText={setEmail}
                placeholder={INGRESSO.registrazione.emailSegnaposto}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label={INGRESSO.registrazione.password}
                value={password}
                onChangeText={setPassword}
                placeholder={INGRESSO.registrazione.passwordSegnaposto(PASSWORD_MINIMA)}
                secureTextEntry
                autoCapitalize="none"
              />

              <TextField
                label={INGRESSO.registrazione.invito.etichetta}
                value={invito}
                onChangeText={(t) => {
                  setInvito(t.toUpperCase());
                  setInvitoOk(null);
                }}
                onBlur={verificaInvito}
                placeholder={INGRESSO.registrazione.invito.segnaposto}
                autoCapitalize="characters"
              />
              <ThemedText
                style={{
                  color: invitoOk === false ? c.danger : invitoOk ? c.positive : c.textSecondary,
                  fontSize: 13,
                }}>
                {invitoOk === false
                  ? INGRESSO.registrazione.invito.nonValido
                  : invitoOk
                    ? INGRESSO.registrazione.invito.valido
                    : INGRESSO.registrazione.invito.comeFunziona}
              </ThemedText>

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: c.dangerSoft }]}>
                  <ThemedText style={{ color: c.danger, fontSize: 14 }}>{error}</ThemedText>
                </View>
              ) : null}

              <Button label={INGRESSO.registrazione.crea} onPress={handleRegister} loading={loading} />
            </Animated.View>

            <View style={styles.footer}>
              <ThemedText style={{ color: c.textSecondary }}>{`${INGRESSO.registrazione.haiAccount} `}</ThemedText>
              <Link href="/(auth)/login" replace>
                <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong }}>
                  {INGRESSO.registrazione.accedi}
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
    gap: Spacing.xs,
  },
  form: { gap: Spacing.md },
  errorBanner: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
