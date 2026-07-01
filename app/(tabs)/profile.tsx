import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getCurrentUser } from '@/data/api';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ricarica il profilo ogni volta che la schermata torna in primo piano,
  // così le modifiche fatte in "Modifica profilo" si vedono subito al ritorno.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getCurrentUser()
        .then((u) => {
          if (!active) return;
          setUser(u);
          setError(null);
        })
        .catch(() => {
          if (active) setError('Impossibile caricare il profilo. Riprova.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error || !user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <ThemedText style={{ color: c.danger }}>
              {error ?? 'Profilo non disponibile.'}
            </ThemedText>
            <Button label="Esci" variant="danger" onPress={() => supabase.auth.signOut()} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Intestazione profilo */}
          <View style={styles.header}>
            <Avatar name={user.nome} size={88} uri={user.fotoUrl} />
            <ThemedText type="title" style={styles.name}>
              {user.nome}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.eta} anni</ThemedText>
          </View>

          {/* Statistiche */}
          <View style={[styles.statsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.stat}>
              <ThemedText type="title" style={styles.statValue}>
                ⭐ {user.ratingMedio.toFixed(1)}
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>Rating</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.stat}>
              <ThemedText type="title" style={styles.statValue}>
                {user.scambiCompletati}
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>Consegne</ThemedText>
            </View>
          </View>

          {/* Bio */}
          {user.bio ? (
            <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ThemedText type="defaultSemiBold">Bio</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>{user.bio}</ThemedText>
            </View>
          ) : null}

          {/* Preferenze birra */}
          {user.preferenzeBirra ? (
            <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ThemedText type="defaultSemiBold">Preferenze birra</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>{user.preferenzeBirra}</ThemedText>
            </View>
          ) : null}

          {/* Modifica profilo */}
          <Button label="Modifica profilo" variant="secondary" onPress={() => router.push('/edit-profile')} />

          {/* Esci — temporaneo, per testare il logout in questo step. Il redirect
              alle schermate di accesso avviene dal guard nel root layout. */}
          <Button label="Esci" variant="danger" onPress={() => supabase.auth.signOut()} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  name: {
    marginTop: Spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  statDivider: {
    width: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
