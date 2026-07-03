import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getCreditBalance, getTransactions } from '@/data/api';
import { formatShortDate } from '@/lib/format';
import type { CreditTransaction } from '@/types';

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
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <ThemedText style={{ color: c.danger }}>{error}</ThemedText>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
          ListHeaderComponent={
            <View style={styles.headerArea}>
              <ThemedText type="title">Wallet</ThemedText>

              {/* Saldo in evidenza */}
              <View style={[styles.balanceCard, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
                <ThemedText style={{ color: c.textSecondary }}>Saldo disponibile</ThemedText>
                <ThemedText style={[styles.balanceValue, { color: c.accent }]}>
                  {balance ?? 0} crediti
                </ThemedText>
                <ThemedText style={[styles.balanceHint, { color: c.textSecondary }]}>
                  I crediti si guadagnano consegnando e si spendono richiedendo. Non sono
                  convertibili in denaro.
                </ThemedText>
              </View>

              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Movimenti
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => <TransactionRow tx={item} />}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border }]} />}
          ListEmptyComponent={
            <ThemedText style={{ color: c.textSecondary, paddingTop: Spacing.sm }}>
              Ancora nessun movimento. Completa una consegna o una richiesta per vederli qui.
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function TransactionRow({ tx }: { tx: CreditTransaction }) {
  const c = useColors();
  const isIncome = tx.tipo === 'entrata';
  const amountColor = isIncome ? c.positive : c.textSecondary;
  const sign = isIncome ? '+' : '−';

  return (
    <View style={styles.txRow}>
      <View style={styles.txInfo}>
        <ThemedText>{tx.descrizione}</ThemedText>
        <ThemedText style={[styles.txDate, { color: c.textSecondary }]}>
          {formatShortDate(tx.data)}
        </ThemedText>
      </View>
      <ThemedText type="defaultSemiBold" style={{ color: amountColor }}>
        {sign}
        {tx.importo}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerArea: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  balanceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
  },
  balanceHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: 2,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txDate: {
    fontSize: 13,
  },
  separator: {
    height: 1,
  },
});
