import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { supabase } from '@/lib/supabase';

/**
 * Atterraggio dei link inviati per email (conferma iscrizione).
 *
 * Sta dentro il gruppo (auth) di proposito: il guardiano delle rotte rimanda
 * al login chiunque non abbia una sessione, e qui la sessione non c'è ancora —
 * si sta creando proprio adesso, scambiando il codice arrivato nel link. Fuori
 * da questo gruppo la schermata verrebbe chiusa prima di finire il lavoro.
 */
export default function AuthCallbackScreen() {
  const c = useColors();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;

    async function conferma() {
      if (!code) {
        if (attivo) setErrore('Link incompleto: riapri quello che hai ricevuto per email.');
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!attivo) return;
      if (error) {
        setErrore('Questo link non è più valido. Può essere già stato usato o essere scaduto.');
        return;
      }
      // Sessione creata: il guardiano nel layout porta da solo all'onboarding
      // o all'app, a seconda di quanto è già stato fatto.
      router.replace('/(tabs)');
    }

    void conferma();
    return () => {
      attivo = false;
    };
  }, [code, router]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.center}>
        {errore ? (
          <>
            <ThemedText type="subtitle">Link non valido</ThemedText>
            <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>{errore}</ThemedText>
            <Button label="Torna all’accesso" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={c.accent} size="large" />
            <ThemedText style={{ color: c.textSecondary }}>Sto confermando il tuo account…</ThemedText>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
});
