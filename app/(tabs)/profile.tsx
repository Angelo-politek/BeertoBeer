import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon, type BrandIconName } from '@/components/ui/brand-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProfileShowcase } from '@/components/profile-showcase';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { getAvailableCredits, getCityGoal, getCurrentUser, getProfileCustomization, getReciprocitySummary, getReviewsForUser, getTransactions, getUrbanMissions } from '@/data/api';
import { PAROLE, PERSONE, VOCE } from '@/constants/testi';
import { useColors } from '@/hooks/use-colors';
import { useCity } from '@/lib/city-context';
import { failureCounter, PARTIAL_LOAD_MESSAGE, withFallback } from '@/lib/load';
import { formatShortDate } from '@/lib/format';
import type { CityGoal, CreditTransaction, ProfileCustomization, ReciprocitySummary, Review, UrbanMission, User } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const c = useColors();
  const { city } = useCity();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [reciprocity, setReciprocity] = useState<ReciprocitySummary>({ given: 0, received: 0 });
  const [missions, setMissions] = useState<UrbanMission[]>([]);
  const [goal, setGoal] = useState<CityGoal | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customization, setCustomization] = useState<ProfileCustomization | null>(null);
  const [available, setAvailable] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const current = await getCurrentUser();
      // Ogni sezione può fallire per conto suo senza far cadere la schermata,
      // ma i guasti si contano: una sezione vuota per errore non deve sembrare
      // una sezione vuota per davvero.
      const guasti = failureCounter();
      const [ratio, nextMissions, cityGoal, txs, latestReviews, custom, disponibili] = await Promise.all([
        withFallback(getReciprocitySummary(), { given: 0, received: 0 }, guasti.segnala),
        withFallback(getUrbanMissions(), [], guasti.segnala),
        withFallback(getCityGoal(city.key), null, guasti.segnala),
        withFallback(getTransactions(), [], guasti.segnala),
        withFallback(getReviewsForUser(current.id), [], guasti.segnala),
        withFallback(getProfileCustomization(current.id), null, guasti.segnala),
        withFallback(getAvailableCredits(), null, guasti.segnala),
      ]);
      if (guasti.quanti > 0) toast.show(PARTIAL_LOAD_MESSAGE, 'error');
      setUser(current); setReciprocity(ratio); setMissions(nextMissions); setGoal(cityGoal); setTransactions(txs.slice(0, 5)); setReviews(latestReviews.slice(0, 3)); setCustomization(custom); setAvailable(disponibili);
    } finally { setLoading(false); setRefreshing(false); }
  }, [city.key, toast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ThemedView style={styles.container}><SafeAreaView><View style={styles.loading}><Skeleton width={88} height={88} radius={44} /><Skeleton width="65%" height={40} /><Skeleton height={150} radius={Radii.lg} /></View></SafeAreaView></ThemedView>;
  if (!user) return <ThemedView style={styles.container}><View style={styles.center}><EmptyState icon="x-mark" title={PERSONE.profilo.fermoTitolo} message={PERSONE.profilo.fermoTesto} actionLabel={VOCE.azione.riprova} onAction={() => load(true)} /></View></ThemedView>;

  const total = reciprocity.given + reciprocity.received;
  const givenRatio = total === 0 ? 0.5 : reciprocity.given / total;
  const goalRatio = goal ? Math.min(1, goal.progress / goal.target) : 0;
  // I BeerCoin promessi a giri ancora aperti non sono spendibili.
  const impegnati = available == null ? 0 : Math.max(user.creditiSaldo - available, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
          <View style={styles.hero}>
            <Avatar name={user.nome} uri={user.fotoUrl} size={82} />
            <View style={styles.heroText}><ThemedText type="label">{(user.citta ?? city.label).toUpperCase()}</ThemedText><ThemedText type="title" style={styles.name}>{user.nome}</ThemedText><ThemedText style={{ color: c.textSecondary }}>{user.ratingMedio.toFixed(1)} su 5 · {user.scambiCompletati} giri</ThemedText></View>
            <Button label={PERSONE.profilo.modifica} size="md" variant="secondary" onPress={() => router.push('/edit-profile')} />
          </View>

          {customization ? <ProfileShowcase value={customization} /> : null}
          <Button label={PERSONE.profilo.vetrina} variant="secondary" onPress={() => router.push('/profile-customize' as never)} />

          <View style={styles.profileActions}>
            {/* Gli amici stavano a tre tocchi di distanza, dentro Impostazioni,
                sotto una card intitolata «Sicurezza»: l'unico riferimento in
                tutto il progetto. Chi non riceveva una richiesta di amicizia
                non li trovava proprio. */}
            <ProfileAction icon="smile" label={PERSONE.profilo.amici} onPress={() => router.push('/amici' as never)} />
            <ProfileAction icon="scooter" label={PERSONE.profilo.mieiGiri} onPress={() => router.push('/my-orders')} />
            <ProfileAction icon="wallet" label={PERSONE.profilo.gettoni} onPress={() => router.push('/beercoin' as never)} />
            <ProfileAction icon="profile" label={PERSONE.profilo.impostazioni} onPress={() => router.push('/settings' as never)} />
          </View>

          <Card style={[styles.balance, { backgroundColor: c.accent }]}>
            <View><ThemedText type="label" style={{ color: c.accentText }}>{PERSONE.profilo.tuoiGettoni}</ThemedText><ThemedText style={[styles.balanceValue, { color: c.accentText }]}>{user.creditiSaldo}</ThemedText></View>
            <BrandIcon name="wallet" size={52} color={c.accentText} />
            {impegnati > 0 ? <ThemedText style={{ color: c.accentText }}>{PERSONE.profilo.impegnati(impegnati, available ?? 0)}</ThemedText> : null}<ThemedText style={{ color: c.accentText }}>{PERSONE.profilo.comeSiGuadagnano}</ThemedText>
          </Card>

          {/* L'invito ha una card sua: e' il modo in cui la community cresce e
              l'unico posto in cui una persona sceglie chi entra. Come quarta
              icona in fila spariva. */}
          <Card onPress={() => router.push('/invite' as never)} style={styles.invito}>
            <View style={styles.flex}>
              <ThemedText type="label">{PERSONE.profilo.invitoEtichetta}</ThemedText>
              <ThemedText type="subtitle">{PERSONE.profilo.invitoTitolo}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                {PERSONE.profilo.invitoTesto}
              </ThemedText>
            </View>
            <BrandIcon name="arrow-right" size={22} color={c.accent} />
          </Card>

          <SectionTitle label={PERSONE.profilo.reciprocitaEtichetta} title={PERSONE.profilo.reciprocitaTitolo} />
          <Card style={styles.ratioCard}>
            <View style={styles.ratioNumbers}><Stat icon="scooter" value={reciprocity.given} label={PERSONE.profilo.haiPortato} /><Stat icon="home" value={reciprocity.received} label={PERSONE.profilo.haiRicevuto} /></View>
            <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}><View style={[styles.fill, { width: `${givenRatio * 100}%`, backgroundColor: c.accent }]} /></View>
            <ThemedText type="caption">{PERSONE.profilo.reciprocitaNota}</ThemedText>
          </Card>

          <SectionTitle label={PERSONE.profilo.settimanaEtichetta} title={PERSONE.profilo.missioniTitolo} />
          {missions.map((mission) => (
            <Card key={mission.key} style={styles.mission}>
              <View style={[styles.missionIcon, { backgroundColor: mission.completed ? c.positiveSoft : c.surfaceAlt }]}><BrandIcon name={mission.completed ? 'check' : 'pin'} size={23} color={mission.completed ? c.positive : c.accent} /></View>
              <View style={styles.flex}><ThemedText type="subtitle">{mission.title}</ThemedText><ThemedText style={{ color: c.textSecondary }}>{mission.description}</ThemedText><ThemedText type="caption">{PERSONE.profilo.missioneProgresso(Math.min(mission.progress, mission.target), mission.target, mission.rewardBeerCoin)}</ThemedText></View>
              {mission.completed ? <ThemedText type="caption" style={{ color: c.positive }}>{mission.claimed ? PERSONE.profilo.missioneAccreditata : PERSONE.profilo.missioneInAccredito}</ThemedText> : null}
            </Card>
          ))}
          {missions.length === 0 ? <EmptyState icon="pin" title={PERSONE.profilo.missioniVuoteTitolo} message={PERSONE.profilo.missioniVuoteTesto} /> : null}

          {goal ? <Card><ThemedText type="label">{PERSONE.profilo.obiettivoEtichetta(city.label)}</ThemedText><ThemedText type="subtitle">{PERSONE.profilo.obiettivoTitolo(goal.progress, goal.target)}</ThemedText><View style={[styles.track, { backgroundColor: c.surfaceAlt }]}><View style={[styles.fill, { width: `${goalRatio * 100}%`, backgroundColor: c.positive }]} /></View><ThemedText type="caption">{PERSONE.profilo.obiettivoNota}</ThemedText></Card> : null}

          <SectionTitle label={PERSONE.profilo.movimentiEtichetta} title={PERSONE.profilo.movimentiTitolo} />
          <Card>{transactions.length ? transactions.map((tx) => <View key={tx.id} style={styles.row}><BrandIcon name={tx.tipo === 'entrata' ? 'plus' : 'arrow-right'} size={18} color={tx.tipo === 'entrata' ? c.positive : c.textSecondary} /><View style={styles.flex}><ThemedText type="defaultSemiBold">{tx.descrizione}</ThemedText><ThemedText type="caption">{formatShortDate(tx.data)}</ThemedText></View><ThemedText type="defaultSemiBold">{tx.tipo === 'entrata' ? '+' : '−'}{tx.importo}</ThemedText></View>) : <ThemedText style={{ color: c.textSecondary }}>{PERSONE.profilo.nessunMovimento}</ThemedText>}</Card>

          <SectionTitle label={PERSONE.profilo.fiduciaEtichetta} title={PERSONE.profilo.recensioniTitolo} />
          <Card>{reviews.length ? reviews.map((review) => <View key={review.id} style={styles.review}><ThemedText type="defaultSemiBold">{review.author?.nome ?? 'Community'} · {review.voto} su 5</ThemedText>{review.commento ? <ThemedText style={{ color: c.textSecondary }}>{review.commento}</ThemedText> : null}</View>) : <ThemedText style={{ color: c.textSecondary }}>{PERSONE.profilo.nessunaRecensione}</ThemedText>}</Card>

          {user.isAdmin ? <Button label={PERSONE.profilo.amministrazione} variant="secondary" onPress={() => router.push('/admin' as never)} /> : null}
          <Card><ThemedText type="subtitle">{PERSONE.profilo.migliora(PAROLE.progetto)}</ThemedText><ThemedText type="caption">{PERSONE.profilo.migliorNota}</ThemedText><Button label={PERSONE.profilo.inviaFeedback} variant="secondary" onPress={() => router.push('/feedback' as never)} /></Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionTitle({ label, title }: { label: string; title: string }) { return <View style={styles.sectionTitle}><ThemedText type="label">{label}</ThemedText><ThemedText type="title">{title}</ThemedText></View>; }
function Stat({ icon, value, label }: { icon: BrandIconName; value: number; label: string }) { const c = useColors(); return <View style={styles.stat}><BrandIcon name={icon} size={24} color={c.accent} /><ThemedText style={styles.statValue}>{value}</ThemedText><ThemedText type="caption">{label}</ThemedText></View>; }
function ProfileAction({ icon, label, onPress }: { icon: BrandIconName; label: string; onPress: () => void }) { const c = useColors(); return <PressableScale onPress={onPress} style={[styles.profileAction, { backgroundColor: c.surface }]}><BrandIcon name={icon} size={23} color={c.accent} /><ThemedText type="caption" style={{ textAlign: 'center' }}>{label}</ThemedText></PressableScale>; }

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1 }, content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md }, loading: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.md }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, heroText: { flex: 1 }, name: { fontSize: 38, lineHeight: 40 }, balance: { minHeight: 170, justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, balanceValue: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 68 },
  invito: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  profileActions: { flexDirection: 'row', gap: Spacing.sm }, profileAction: { flex: 1, minHeight: 74, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  sectionTitle: { marginTop: Spacing.sm }, ratioCard: { gap: Spacing.md }, ratioNumbers: { flexDirection: 'row' }, stat: { flex: 1, alignItems: 'center', gap: 2 }, statValue: { fontFamily: Fonts.display, fontSize: 36, lineHeight: 40 }, track: { height: 9, borderRadius: 2, overflow: 'hidden' }, fill: { height: 9 },
  mission: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }, missionIcon: { width: 46, height: 46, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' }, row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, review: { paddingVertical: Spacing.sm, gap: 4 },
});
