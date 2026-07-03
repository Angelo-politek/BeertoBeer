import { useFocusEffect, useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCurrentUser, getReviewsForUser } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Review, User } from '@/types';

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const u = await getCurrentUser();
      const latestReviews = await getReviewsForUser(u.id);
      setUser(u);
      setReviews(latestReviews.slice(0, 3));
      setError(null);
    } catch {
      setError('Impossibile caricare il profilo. Riprova.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) {
      setUpdateMessage('Gli update OTA si testano su una build preview o production.');
      return;
    }

    setCheckingUpdate(true);
    setUpdateMessage(null);

    try {
      const result = await Updates.checkForUpdateAsync();

      if (!result.isAvailable) {
        setUpdateMessage('Sei gia all\'ultima versione disponibile.');
        return;
      }

      setUpdateMessage('Aggiornamento trovato, scarico e riavvio...');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setUpdateMessage('Controllo aggiornamenti non riuscito.');
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  // Ricarica il profilo ogni volta che la schermata torna in primo piano,
  // così le modifiche fatte in "Modifica profilo" si vedono subito al ritorno.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
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

          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Ultime recensioni</ThemedText>
            {reviews.length === 0 ? (
              <EmptyState title="Nessuna recensione" message="Le recensioni ricevute appariranno qui." />
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={[styles.review, { borderTopColor: c.border }]}>
                  <View style={styles.reviewHeader}>
                    <ThemedText type="defaultSemiBold">{review.author?.nome ?? 'Utente'}</ThemedText>
                    <ThemedText style={{ color: c.textSecondary }}>{formatShortDate(review.createdAt)}</ThemedText>
                  </View>
                  <StarRating value={review.voto} readonly size={20} />
                  {review.commento ? <ThemedText style={{ color: c.textSecondary }}>{review.commento}</ThemedText> : null}
                </View>
              ))
            )}
          </View>

          {/* Modifica profilo + connessioni */}
          <Button label="Modifica profilo" variant="secondary" onPress={() => router.push('/edit-profile')} />
          <Button
            label="💬 Le mie connessioni"
            variant="secondary"
            onPress={() => router.push('/connections' as never)}
          />

          {/* Amministrazione — visibile solo agli admin (flag privato is_admin) */}
          {user.isAdmin ? (
            <Button
              label="🛡 Pannello amministrazione"
              variant="secondary"
              onPress={() => router.push('/admin' as never)}
            />
          ) : null}

          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Aggiornamenti beta</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              Le build preview e production scaricano gli update JS senza rifare l’APK.
            </ThemedText>
            {updateMessage ? <ThemedText style={{ color: c.textSecondary }}>{updateMessage}</ThemedText> : null}
            <Button
              label="Controlla aggiornamenti"
              variant="secondary"
              onPress={handleCheckForUpdates}
              loading={checkingUpdate}
              disabled={checkingUpdate}
            />
          </View>

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
  review: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});
