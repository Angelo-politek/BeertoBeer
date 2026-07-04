import { useFocusEffect, useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BadgeGrid } from '@/components/badge-grid';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { LevelBadge } from '@/components/level-badge';
import { Skeleton } from '@/components/skeleton';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LEVELS, nextLevel, TOKEN_NAME } from '@/constants/branding';
import { Radii, Spacing, Springs } from '@/constants/theme';
import { getCurrentUser, getReviewsForUser, getUserBadges } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Review, User, UserBadge } from '@/types';

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
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
      const [latestReviews, userBadges] = await Promise.all([
        getReviewsForUser(u.id),
        getUserBadges(u.id).catch(() => []),
      ]);
      setUser(u);
      setReviews(latestReviews.slice(0, 3));
      setBadges(userBadges);
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
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loadingArea}>
            <View style={styles.loadingHero}>
              <Skeleton width={96} height={96} radius={48} />
              <Skeleton width="50%" height={26} />
              <Skeleton width="30%" height={18} />
            </View>
            <Skeleton height={110} radius={Radii.lg} />
            <Skeleton height={220} radius={Radii.lg} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error || !user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <EmptyState emoji="😵" title="Ops" message={error ?? 'Profilo non disponibile.'} />
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
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
          {/* Intestazione profilo */}
          <Animated.View entering={FadeInDown.springify().damping(20).stiffness(180)} style={styles.header}>
            <Avatar name={user.nome} size={92} uri={user.fotoUrl} ring />
            <ThemedText type="title" style={styles.name}>
              {user.nome}
            </ThemedText>
            <View style={styles.headerMeta}>
              <LevelBadge level={user.livello ?? 0} size="md" />
              <ThemedText style={{ color: c.textSecondary }}>· {user.eta} anni</ThemedText>
            </View>
          </Animated.View>

          {/* Progresso al livello successivo */}
          <LevelProgress scambi={user.scambiCompletati} />

          {/* Statistiche */}
          <Card index={1} style={styles.statsCard}>
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>⭐ {user.ratingMedio.toFixed(1)}</ThemedText>
              <ThemedText type="caption">Rating</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.stat}>
              <ThemedText style={[styles.statValue, { color: c.accentStrong }]}>{user.scambiCompletati}</ThemedText>
              <ThemedText type="caption">Giri</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.stat}>
              <ThemedText
                style={[styles.statValue, { color: (user.karma ?? 0) >= 0 ? c.positive : c.danger }]}>
                {(user.karma ?? 0) > 0 ? '+' : ''}
                {user.karma ?? 0}
              </ThemedText>
              <ThemedText type="caption">Karma</ThemedText>
            </View>
          </Card>

          {/* Nudge karma: chi ordina e basta è invitato a consegnare */}
          {(user.karma ?? 0) < 0 ? (
            <View style={[styles.nudge, { backgroundColor: c.accentSoft }]}>
              <ThemedText style={{ color: c.accentStrong, fontSize: 15, lineHeight: 21 }}>
                🍺 Ordini più di quanto consegni. Fai un giro per riequilibrare il karma e guadagnare {TOKEN_NAME}!
              </ThemedText>
            </View>
          ) : null}

          {/* Badge */}
          <Card index={2}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              I tuoi badge {badges.length > 0 ? `(${badges.length}/${LEVELS.length + 7})` : ''}
            </ThemedText>
            <BadgeGrid unlocked={badges} />
          </Card>

          {/* Bio */}
          {user.bio ? (
            <Card index={3}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Bio
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>{user.bio}</ThemedText>
            </Card>
          ) : null}

          {/* Preferenze birra */}
          {user.preferenzeBirra ? (
            <Card index={4}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Preferenze birra
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>{user.preferenzeBirra}</ThemedText>
            </Card>
          ) : null}

          <Card index={5}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Ultime recensioni
            </ThemedText>
            {reviews.length === 0 ? (
              <EmptyState emoji="💬" title="Nessuna recensione" message="Le recensioni ricevute appariranno qui." />
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={[styles.review, { borderTopColor: c.border }]}>
                  <View style={styles.reviewHeader}>
                    <ThemedText type="defaultSemiBold">{review.author?.nome ?? 'Utente'}</ThemedText>
                    <ThemedText type="caption">{formatShortDate(review.createdAt)}</ThemedText>
                  </View>
                  <StarRating value={review.voto} readonly size={20} />
                  {review.commento ? <ThemedText style={{ color: c.textSecondary }}>{review.commento}</ThemedText> : null}
                </View>
              ))
            )}
          </Card>

          {/* Modifica profilo */}
          <Button label="Modifica profilo" variant="secondary" onPress={() => router.push('/edit-profile')} />

          {/* Amministrazione — visibile solo agli admin (flag privato is_admin) */}
          {user.isAdmin ? (
            <Button
              label="🛡 Pannello amministrazione"
              variant="secondary"
              onPress={() => router.push('/admin' as never)}
            />
          ) : null}

          <Card>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Aggiornamenti beta
            </ThemedText>
            <ThemedText type="caption" style={{ marginBottom: Spacing.sm }}>
              Le build preview e production scaricano gli update JS senza rifare l’APK.
            </ThemedText>
            {updateMessage ? (
              <ThemedText type="caption" style={{ marginBottom: Spacing.sm }}>
                {updateMessage}
              </ThemedText>
            ) : null}
            <Button
              label="Controlla aggiornamenti"
              variant="secondary"
              size="md"
              onPress={handleCheckForUpdates}
              loading={checkingUpdate}
              disabled={checkingUpdate}
            />
          </Card>

          {/* Esci — il redirect alle schermate di accesso avviene dal guard nel root layout. */}
          <Button label="Esci" variant="danger" onPress={() => supabase.auth.signOut()} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Barra di progresso animata verso il livello Peroni successivo. */
function LevelProgress({ scambi }: { scambi: number }) {
  const c = useColors();
  const next = nextLevel(scambi);
  const progressValue = useSharedValue(0);

  const prevThreshold = LEVELS.filter((l) => l.scambiRichiesti <= scambi).pop()?.scambiRichiesti ?? 0;
  const span = next ? next.scambiRichiesti - prevThreshold || 1 : 1;
  const progress = next ? Math.max(0.03, Math.min(1, (scambi - prevThreshold) / span)) : 1;

  useEffect(() => {
    progressValue.value = withDelay(300, withSpring(progress, Springs.gentle));
  }, [progress, progressValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  if (!next) {
    return (
      <ThemedText style={{ color: c.textSecondary, textAlign: 'center' }}>
        🏆 Hai raggiunto il livello massimo. Sei una leggenda.
      </ThemedText>
    );
  }
  const mancano = next.scambiRichiesti - scambi;

  return (
    <View style={styles.levelProgress}>
      <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: c.accent }, fillStyle]} />
      </View>
      <ThemedText type="caption" style={{ textAlign: 'center' }}>
        Ancora {mancano} {mancano === 1 ? 'giro' : 'giri'} per diventare {next.emoji} {next.titolo}
      </ThemedText>
    </View>
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
  loadingArea: { padding: Spacing.md, gap: Spacing.md },
  loadingHero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
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
    marginTop: Spacing.sm,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statDivider: {
    width: 1,
  },
  nudge: {
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  levelProgress: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  review: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});
