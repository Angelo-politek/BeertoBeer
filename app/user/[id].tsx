import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ReportModal } from '@/components/report-modal';
import { StarRating } from '@/components/star-rating';
import { useToast } from '@/components/toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  blockUser,
  getReviewsForUser,
  getUserById,
  isUserBlocked,
  reportUser,
  unblockUser,
} from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { formatShortDate } from '@/lib/format';
import type { ReportReason, Review, User } from '@/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { session } = useSession();
  const toast = useToast();
  const isMe = session?.user.id === id;

  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('comportamento_scorretto');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getUserById(id), getReviewsForUser(id), isMe ? Promise.resolve(false) : isUserBlocked(id)])
      .then(([profile, profileReviews, isBlocked]) => {
        if (!active) return;
        setUser(profile);
        setReviews(profileReviews);
        setBlocked(isBlocked);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isMe]);

  async function handleReport() {
    setActionLoading(true);
    try {
      await reportUser(id, reportReason, reportDetails);
      setReportOpen(false);
      setReportDetails('');
      toast.show('Segnalazione inviata, grazie');
    } catch {
      Alert.alert('Errore', 'Segnalazione non inviata.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBlockToggle() {
    setActionLoading(true);
    try {
      if (blocked) {
        await unblockUser(id);
        setBlocked(false);
        toast.show('Utente sbloccato');
      } else {
        await blockUser(id);
        setBlocked(true);
        toast.show('Utente bloccato');
      }
    } catch {
      Alert.alert('Errore', 'Operazione non riuscita.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Profilo' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Profilo' }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">Utente non trovato</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: user.nome }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={user.nome} size={88} uri={user.fotoUrl} />
          <ThemedText type="title" style={styles.name}>
            {user.nome}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{user.eta} anni</ThemedText>
        </View>

        <View style={[styles.statsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.stat}>
            <ThemedText type="title" style={styles.statValue}>
              {user.ratingMedio.toFixed(1)}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>Rating</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.stat}>
            <ThemedText type="title" style={styles.statValue}>
              {user.scambiCompletati}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>Scambi</ThemedText>
          </View>
        </View>

        {user.bio ? (
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Bio</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.bio}</ThemedText>
          </View>
        ) : null}

        {user.preferenzeBirra ? (
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Preferenze birra</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.preferenzeBirra}</ThemedText>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText type="defaultSemiBold">Recensioni</ThemedText>
          {reviews.length === 0 ? (
            <EmptyState title="Nessuna recensione" message="Le recensioni degli scambi completati appariranno qui." />
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

        {!isMe ? (
          <View style={styles.actions}>
            <Button label="Segnala utente" variant="danger" onPress={() => setReportOpen(true)} disabled={actionLoading} />
            <Button
              label={blocked ? 'Sblocca utente' : 'Blocca utente'}
              variant="secondary"
              onPress={handleBlockToggle}
              loading={actionLoading}
            />
          </View>
        ) : null}
      </ScrollView>
      <ReportModal
        visible={reportOpen}
        reason={reportReason}
        details={reportDetails}
        loading={actionLoading}
        onReasonChange={setReportReason}
        onDetailsChange={setReportDetails}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  name: { marginTop: Spacing.xs },
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 28, lineHeight: 34 },
  statDivider: { width: 1 },
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
  actions: {
    gap: Spacing.sm,
  },
});
