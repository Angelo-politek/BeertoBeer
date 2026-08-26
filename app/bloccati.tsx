import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { getBlockedUsers, unblockUser } from '@/data/api';
import type { BlockedUser } from '@/types';
import { useColors } from '@/hooks/use-colors';
import { PERSONE, VOCE } from '@/constants/testi';
import { messaggioServer } from '@/lib/errori';
import { relative } from '@/lib/format';

/**
 * LE PERSONE CHE HAI BLOCCATO.
 *
 * `getBlockedUsers` esisteva in data/api.ts da mesi, implementata e senza
 * nessuna schermata che la chiamasse. Sembrava codice morto da cancellare, e
 * non lo era: bloccare si poteva fare solo dal profilo di una persona, quindi
 * **se bloccavi qualcuno e poi non riuscivi a ritrovare il suo profilo, il
 * blocco era irreversibile dall'app.**
 *
 * Cancellare la funzione avrebbe fotografato il difetto invece di curarlo.
 * «Senza consumatori» a volte significa «manca la schermata».
 */
export default function BloccatiScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [bloccati, setBloccati] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setBloccati(await getBlockedUsers());
      setErrore(null);
    } catch (e) {
      setErrore(messaggioServer(e, PERSONE.bloccati.reteKo));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function sblocca(b: BlockedUser) {
    const nome = b.user?.nome ?? PERSONE.bloccati.senzaNome;
    Alert.alert(
      PERSONE.bloccati.sblocchiTitolo(nome),
      PERSONE.bloccati.sbloccaConferma,
      [
        { text: PERSONE.bloccati.restaBloccata, style: 'cancel' },
        {
          text: PERSONE.altrui.sblocca,
          onPress: async () => {
            try {
              await unblockUser(b.blockedUserId);
              toast.show(PERSONE.bloccati.sbloccata(nome));
              await load(true);
            } catch (e) {
              Alert.alert(PERSONE.bloccati.nonSbloccata, messaggioServer(e, VOCE.riserva.riprovaFraPoco));
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: PERSONE.bloccati.titolo }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
        {loading ? (
          <SkeletonCard />
        ) : errore ? (
          <EmptyState
            icon="x-mark"
            title={PERSONE.bloccati.nonDisponibile}
            message={errore}
            actionLabel="Riprova"
            onAction={() => load(true)}
          />
        ) : bloccati.length === 0 ? (
          <EmptyState
            icon="check"
            title={PERSONE.bloccati.vuotoTitolo}
            message={PERSONE.bloccati.vuotoTesto}
            actionLabel={PERSONE.bloccati.tornaIndietro}
            onAction={() => router.back()}
          />
        ) : (
          <>
            <ThemedText style={{ color: c.textSecondary }}>
              {PERSONE.bloccati.cosaComporta}
            </ThemedText>
            {bloccati.map((b) => (
              <View key={b.id} style={[styles.riga, { backgroundColor: c.surface }]}>
                <Pressable
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: b.blockedUserId } })}
                  style={styles.persona}>
                  <Avatar name={b.user?.nome ?? '?'} uri={b.user?.fotoUrl} size={40} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{b.user?.nome ?? PERSONE.bloccati.nonPiuEsistente}</ThemedText>
                    <ThemedText type="caption" style={{ color: c.textSecondary }}>
                      bloccata {relative(b.createdAt)}
                    </ThemedText>
                  </View>
                </Pressable>
                <Button label={PERSONE.altrui.sblocca} variant="secondary" onPress={() => sblocca(b)} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  riga: { borderRadius: 12, padding: Spacing.md, gap: Spacing.sm },
  persona: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
