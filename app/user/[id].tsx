import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FotoIntera } from '@/components/foto-intera';
import { ReportModal } from '@/components/report-modal';
import { StarRating } from '@/components/star-rating';
import { useToast } from '@/components/toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProfileShowcase } from '@/components/profile-showcase';
import { PressableScale } from '@/components/ui/pressable-scale';
import { COMPLIMENT_LABELS } from '@/constants/compliments';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import {
  blockUser,
  chiediAmicizia,
  getProfiloExtra,
  getRelazione,
  togliAmicizia,
  type ProfiloExtra,
  type Relazione,
  getCompliments,
  getProfileCustomization,
  getReviewsForUser,
  getUserById,
  isUserBlocked,
  reportUser,
  unblockUser,
} from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { formatShortDate } from '@/lib/format';
import { messaggioServer } from '@/lib/errori';
import type { ComplimentCount, ProfileCustomization, ReportReason, Review, User } from '@/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { session } = useSession();
  const toast = useToast();
  const isMe = session?.user.id === id;

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [compliments, setCompliments] = useState<ComplimentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('comportamento_scorretto');
  const [reportDetails, setReportDetails] = useState('');
  const [customization, setCustomization] = useState<ProfileCustomization | null>(null);
  const [extra, setExtra] = useState<ProfiloExtra | null>(null);
  const [relazione, setRelazione] = useState<Relazione>('nessuna');
  const [fotoAperta, setFotoAperta] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getUserById(id),
      getReviewsForUser(id),
      isMe ? Promise.resolve(false) : isUserBlocked(id),
      getCompliments(id).catch(() => []),
      getProfileCustomization(id).catch(() => null),
      getProfiloExtra(id).catch(() => null),
      isMe ? Promise.resolve<Relazione>('nessuna') : getRelazione(id).catch((): Relazione => 'nessuna'),
    ])
      .then(([profile, profileReviews, isBlocked, userCompliments, custom, profExtra, rel]) => {
        if (!active) return;
        setUser(profile);
        setReviews(profileReviews);
        setBlocked(isBlocked);
        setCompliments(userCompliments);
        setCustomization(custom);
        setExtra(profExtra);
        setRelazione(rel);
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

  /**
   * Il pulsante dell'amicizia cambia significato a seconda di dove si e':
   * chiedere, accettare (se l'altro ha gia' chiesto), o togliere.
   */
  async function gestisciAmicizia() {
    setActionLoading(true);
    try {
      if (relazione === 'amico') {
        await togliAmicizia(id);
        setRelazione('nessuna');
        toast.show('Non siete più amici.');
      } else {
        // Se l'altro aveva gia' chiesto, chiedere equivale ad accettare: il
        // database lo sa e risponde «accettata».
        const esito = await chiediAmicizia(id);
        setRelazione(esito === 'accettata' ? 'amico' : 'in_attesa');
        toast.show(esito === 'accettata' ? 'Ora siete amici.' : 'Richiesta inviata.');
      }
    } catch (e) {
      Alert.alert('Non riuscita', messaggioServer(e, 'Riprova fra poco.'));
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
          <Avatar name={user.nome} size={88} uri={user.fotoUrl} ring />
          <ThemedText type="title" style={styles.name}>
            {user.nome}
          </ThemedText>
          <View style={styles.headerMeta}>
            <ThemedText style={{ color: c.textSecondary }}>· {user.eta} anni</ThemedText>
          </View>
          {/* Founder e amministratore si vedono: chi apre un profilo deve
              sapere se sta parlando con chi il progetto lo manda avanti. */}
          {extra?.founder || extra?.isAdmin ? (
            <View style={styles.etichette}>
              {extra.founder ? (
                <View style={[styles.etichetta, { backgroundColor: c.accent }]}>
                  <ThemedText type="caption" style={{ color: c.accentText }}>FONDATORE</ThemedText>
                </View>
              ) : null}
              {extra.isAdmin ? (
                <View style={[styles.etichetta, { borderWidth: 1, borderColor: c.accent }]}>
                  <ThemedText type="caption" style={{ color: c.accent }}>AMMINISTRAZIONE</ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
          {extra?.invitanteNome && extra.invitanteId ? (
            <PressableScale
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: extra.invitanteId as string } })}>
              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {`Invitato da ${extra.invitanteNome}`}
              </ThemedText>
            </PressableScale>
          ) : null}
        </View>

        {!isMe ? (
          <View style={styles.azioniAlte}>
            <Button
              label="Scrivi"
              variant="secondary"
              onPress={() => router.push({ pathname: '/chat/direct/[userId]', params: { userId: id } } as never)}
              style={styles.meta}
            />
            <Button
              label={
                relazione === 'amico'
                  ? 'Siete amici'
                  : relazione === 'in_attesa'
                    ? 'Richiesta inviata'
                    : relazione === 'in_arrivo'
                      ? 'Accetta'
                      : 'Aggiungi'
              }
              variant={relazione === 'amico' ? 'secondary' : 'primary'}
              disabled={relazione === 'in_attesa'}
              loading={actionLoading}
              onPress={gestisciAmicizia}
              style={styles.meta}
            />
          </View>
        ) : null}

        <Card style={styles.statsCard}>
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
            <ThemedText style={[styles.statValue, { color: (user.karma ?? 0) >= 0 ? c.positive : c.danger }]}>
              {(user.karma ?? 0) > 0 ? '+' : ''}{user.karma ?? 0}
            </ThemedText>
            <ThemedText type="caption">Karma</ThemedText>
          </View>
        </Card>

        {/* La vetrina era renderizzata dentro il ramo `if (loading)`: compariva
            solo mentre la schermata caricava, quando è ancora vuota. Nessuno
            l'ha mai vista. Va qui, dove il profilo si guarda davvero. */}
        {customization ? <ProfileShowcase value={customization} onApriFoto={setFotoAperta} /> : null}

        {user.bio ? (
          <Card style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Bio</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.bio}</ThemedText>
          </Card>
        ) : null}

        {user.preferenzeBirra ? (
          <Card style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Preferenze birra</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.preferenzeBirra}</ThemedText>
          </Card>
        ) : null}

        {user.interessi && user.interessi.length > 0 ? (
          <Card style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Interessi</ThemedText>
            <View style={styles.tags}>
              {user.interessi.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 13, color: c.accentStrong }}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}


        {compliments.length > 0 ? (
          <Card style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Complimenti ricevuti</ThemedText>
            <View style={styles.tags}>
              {compliments.map((comp) => (
                <View key={comp.tipo} style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 13, color: c.accentStrong }}>
                    {COMPLIMENT_LABELS[comp.tipo] ?? comp.tipo} · {comp.n}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Recensioni</ThemedText>
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
                {/* I tre voti di dettaglio erano nel database dalla V2.1 e non
                    li leggeva nessuno: sul profilo compariva solo la media.
                    Sono proprio quelli che dicono se una persona e' puntuale
                    o se si fa capire. */}
                {review.puntualita || review.comunicazione || review.rispetto ? (
                  <View style={styles.dettagli}>
                    {review.puntualita ? <Dettaglio etichetta="Puntualita" voto={review.puntualita} /> : null}
                    {review.comunicazione ? <Dettaglio etichetta="Comunicazione" voto={review.comunicazione} /> : null}
                    {review.rispetto ? <Dettaglio etichetta="Rispetto" voto={review.rispetto} /> : null}
                  </View>
                ) : null}
                {review.commento ? <ThemedText style={{ color: c.textSecondary }}>{review.commento}</ThemedText> : null}
              </View>
            ))
          )}
        </Card>

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
      {customization && fotoAperta != null ? (
        <FotoIntera
          uri={customization.photos[fotoAperta]?.url ?? null}
          indice={fotoAperta}
          totale={customization.photos.length}
          onClose={() => setFotoAperta(null)}
          onScorri={(avanti) =>
            setFotoAperta((i) => {
              const n = customization.photos.length;
              if (i == null || n === 0) return i;
              return (i + (avanti ? 1 : -1) + n) % n;
            })
          }
        />
      ) : null}

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

/** Un voto di dettaglio, in una riga sola: «Puntualita 4/5». */
function Dettaglio({ etichetta, voto }: { etichetta: string; voto: number }) {
  const c = useColors();
  return (
    <ThemedText type="caption" style={{ color: voto >= 4 ? c.positive : c.textSecondary }}>
      {`${etichetta} ${voto}/5`}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  name: { marginTop: Spacing.sm },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  etichette: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  etichetta: { borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  azioniAlte: { flexDirection: 'row', gap: Spacing.sm },
  meta: { flex: 1 },
  statsCard: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 30, letterSpacing: 0.5 },
  statDivider: { width: 1 },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: { marginBottom: Spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  dettagli: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
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
