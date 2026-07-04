import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NIGHT_BONUS_PT, REFERRAL_TOKENS, TOKEN_EMOJI, TOKEN_NAME } from '@/constants/branding';
import { Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';
import { getCreditBalance, getTransactions } from '@/data/api';
import { formatShortDate } from '@/lib/format';
import type { CreditTransaction } from '@/types';

/** Modi per guadagnare PeroniToken, mostrati nel wallet come hub di engagement. */
const EARN_WAYS: { emoji: string; text: string }[] = [
  { emoji: '🚴', text: 'Consegna una birra (fai un giro)' },
  { emoji: '🏅', text: 'Sblocca badge usando l’app' },
  { emoji: '⬆️', text: 'Sali di livello Peroni' },
  { emoji: '🦉', text: `Consegna dopo le 22 (+${NIGHT_BONUS_PT} PT)` },
  { emoji: '🤝', text: `Invita un amico (+${REFERRAL_TOKENS} PT)` },
];

export default function WalletScreen() {
  const c = useColors();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [b, txs] = await Promise.all([getCreditBalance(), getTransactions()]);
      setBalance(b);
      setTransactions(txs);
      setError(null);
    } catch {
      setError('Impossibile caricare il wallet. Riprova.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
            <ThemedText type="title">Wallet</ThemedText>
            <Skeleton height={170} radius={Radii.xl} />
            <Skeleton height={180} radius={Radii.lg} />
            <Skeleton height={16} width="40%" />
            <Skeleton height={56} radius={Radii.md} />
            <Skeleton height={56} radius={Radii.md} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <EmptyState emoji="😵" title="Ops" message={error} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.headerArea}>
              <View style={styles.titleBlock}>
                <ThemedText type="label">Il tuo tesoro 💰</ThemedText>
                <ThemedText type="title">Wallet</ThemedText>
              </View>

              {/* Saldo in evidenza */}
              <BalanceCard balance={balance ?? 0} />

              {/* Come guadagnare — hub di engagement */}
              <Card index={1}>
                <ThemedText type="subtitle" style={styles.earnTitle}>
                  Come guadagnare {TOKEN_EMOJI}
                </ThemedText>
                {EARN_WAYS.map((w) => (
                  <View key={w.text} style={styles.earnRow}>
                    <View style={[styles.earnIcon, { backgroundColor: c.surfaceAlt }]}>
                      <ThemedText style={styles.earnEmoji}>{w.emoji}</ThemedText>
                    </View>
                    <ThemedText style={{ color: c.textSecondary, flex: 1, fontSize: 15 }}>{w.text}</ThemedText>
                  </View>
                ))}
              </Card>

              <ThemedText type="label" style={styles.sectionTitle}>
                Movimenti
              </ThemedText>
            </View>
          }
          renderItem={({ item, index }) => <TransactionRow tx={item} index={index} />}
          ListEmptyComponent={
            <EmptyState
              emoji="🧾"
              title="Ancora nessun movimento"
              message="Completa una consegna o una richiesta per vedere qui i tuoi PeroniToken in movimento."
            />
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

/** Card hero del saldo: ambra soft, numero gigante che "sboccia" all'ingresso. */
function BalanceCard({ balance }: { balance: number }) {
  const c = useColors();
  const sh = useShadows();

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(180)}
      style={[styles.balanceCard, { backgroundColor: c.accentSoft }, sh.card]}>
      <ThemedText type="label" style={{ color: c.accentStrong }}>
        {TOKEN_NAME} disponibili
      </ThemedText>
      <Animated.View entering={ZoomIn.delay(150).springify().damping(12).stiffness(200)} style={styles.balanceRow}>
        <ThemedText style={styles.balanceEmoji}>{TOKEN_EMOJI}</ThemedText>
        <ThemedText type="display" style={{ color: c.accentStrong }}>
          {balance}
        </ThemedText>
      </Animated.View>
      <ThemedText type="caption" style={{ color: c.textSecondary }}>
        I {TOKEN_NAME} non si comprano: si guadagnano contribuendo alla community e si spendono per
        farti portare le birre. Non sono convertibili in denaro.
      </ThemedText>
    </Animated.View>
  );
}

function TransactionRow({ tx, index }: { tx: CreditTransaction; index: number }) {
  const c = useColors();
  const isIncome = tx.tipo === 'entrata';

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(20).stiffness(180)}
      style={[styles.txRow, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.txIcon, { backgroundColor: isIncome ? c.positiveSoft : c.surfaceAlt }]}>
        <ThemedText style={{ fontSize: 16 }}>{isIncome ? '↓' : '↑'}</ThemedText>
      </View>
      <View style={styles.txInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 15 }}>
          {tx.descrizione}
        </ThemedText>
        <ThemedText type="caption">{formatShortDate(tx.data)}</ThemedText>
      </View>
      <ThemedText type="defaultSemiBold" style={{ color: isIncome ? c.positive : c.textSecondary }}>
        {isIncome ? '+' : '−'}
        {tx.importo}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  loadingArea: { padding: Spacing.md, gap: Spacing.md },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  headerArea: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  titleBlock: { gap: 2, paddingHorizontal: 4 },
  balanceCard: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: 2,
  },
  balanceEmoji: { fontSize: 34, lineHeight: 44 },
  earnTitle: { marginBottom: Spacing.sm },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2, paddingVertical: 5 },
  earnIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnEmoji: { fontSize: 16 },
  sectionTitle: {
    marginTop: Spacing.xs,
    paddingHorizontal: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    gap: 1,
  },
});
