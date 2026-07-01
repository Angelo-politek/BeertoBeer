import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequestCard } from '@/components/request-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getRequests } from '@/data/api';
import type { BeerRequest } from '@/types';

export default function FeedScreen() {
  const router = useRouter();
  const colors = useColors();
  const [requests, setRequests] = useState<BeerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getRequests()
        .then((r) => {
          if (!active) return;
          setRequests(r);
          setError(null);
        })
        .catch(() => {
          if (active) setError('Impossibile caricare le richieste. Riprova.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="title">Richieste</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Birre da consegnare vicino a te
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/create-request')}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.6 : 1 },
            ]}>
            <Text style={[styles.newButtonText, { color: colors.accentText }]}>+ Nuova</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/my-orders')}
          style={({ pressed }) => [styles.myOrders, { opacity: pressed ? 0.6 : 1 }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.accent }}>
            I miei ordini ›
          </ThemedText>
        </Pressable>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText style={{ color: colors.danger }}>{error}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <RequestCard
                request={item}
                onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText type="defaultSemiBold">Nessuna richiesta aperta</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Quando qualcuno pubblica una richiesta di birre nelle vicinanze, comparirà qui.
                </ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    fontSize: 15,
  },
  newButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  myOrders: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
});
