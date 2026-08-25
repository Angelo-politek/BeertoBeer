import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radii, Spacing } from '@/constants/theme';
import { getAmici, getConnections, rispondiAmicizia, type Amico, type Connection } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { getCity } from '@/lib/cities';

/**
 * GLI AMICI.
 *
 * Segnalazione del collaudo: «da implementare sistema amici con rete di amici,
 * meccanismo con richiesta di amicizia da accettare, chat con gli amici con la
 * cronologia conservata, sezione in cui poter vedere tutti gli amici».
 *
 * Deciso con Alessio: gli amici sono SOLO sociali. Non cambiano niente su
 * giri, crediti o visibilita' — con poche persone in citta', giri riservati
 * agli amici frammenterebbero una beta gia' piccola.
 *
 * La chat con la cronologia non e' stata rifatta: esisteva gia' (chat diretta
 * fra persone che hanno concluso uno scambio) e funzionava. Qui si aggiunge
 * solo il legame esplicito che prima mancava.
 *
 * Le CONNESSIONI restano, ma cambiano mestiere: prima erano l'elenco implicito
 * di chi conoscevi, ora sono il suggerimento («queste le conosci gia'»). Due
 * elenchi che dicono la stessa cosa sarebbero stati un doppione.
 */
export default function AmiciScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [amici, setAmici] = useState<Amico[]>([]);
  const [conosciute, setConosciute] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inCorso, setInCorso] = useState<string | null>(null);

  const carica = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const [a, k] = await Promise.all([getAmici(), getConnections().catch(() => [] as Connection[])]);
      setAmici(a);
      setConosciute(k);
    } catch (e) {
      Alert.alert('Non caricato', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica]),
  );

  async function rispondi(a: Amico, accetta: boolean) {
    setInCorso(a.richiestaId);
    try {
      await rispondiAmicizia(a.richiestaId, accetta);
      toast.show(accetta ? `Ora sei amico di ${a.nome}.` : 'Richiesta rifiutata.');
      await carica();
    } catch (e) {
      Alert.alert('Non riuscita', messaggioServer(e, 'Riprova.'));
    } finally {
      setInCorso(null);
    }
  }

  const daRispondere = amici.filter((a) => a.relazione === 'in_arrivo');
  const confermati = amici.filter((a) => a.relazione === 'amico');
  const inAttesa = amici.filter((a) => a.relazione === 'in_attesa');

  /** Chi conosci gia' dagli scambi ma non hai ancora fra gli amici. */
  const daSuggerire = conosciute.filter((k) => !amici.some((a) => a.id === k.user.id));

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'I miei amici' }} />
      {loading ? (
        <View style={styles.skeletons}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={confermati}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void carica(true)} tintColor={c.accent} />
          }
          ListHeaderComponent={
            <View style={styles.testa}>
              {/* Le richieste in arrivo per prime: sono l'unica cosa che
                  richiede una risposta. */}
              {daRispondere.length > 0 ? (
                <View style={styles.sezione}>
                  <ThemedText type="label">TI HANNO CHIESTO L’AMICIZIA</ThemedText>
                  {daRispondere.map((a) => (
                    <View key={a.id} style={[styles.riga, { backgroundColor: c.surface }]}>
                      <Avatar name={a.nome} uri={a.fotoUrl ?? undefined} size={44} />
                      <View style={styles.flex}>
                        <ThemedText type="defaultSemiBold">{a.nome}</ThemedText>
                        {a.citta ? (
                          <ThemedText type="caption" style={{ color: c.textSecondary }}>
                            {getCity(a.citta).label}
                          </ThemedText>
                        ) : null}
                      </View>
                      <Button
                        label="No"
                        variant="secondary"
                        size="md"
                        disabled={inCorso === a.richiestaId}
                        onPress={() => void rispondi(a, false)}
                      />
                      <Button
                        label="Accetta"
                        size="md"
                        loading={inCorso === a.richiestaId}
                        onPress={() => void rispondi(a, true)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              {confermati.length > 0 ? <ThemedText type="label">AMICI</ThemedText> : null}
            </View>
          }
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } } as never)}
              style={[styles.riga, { backgroundColor: c.surface }]}>
              <Avatar name={item.nome} uri={item.fotoUrl ?? undefined} size={44} />
              <View style={styles.flex}>
                <ThemedText type="defaultSemiBold">{item.nome}</ThemedText>
                {item.citta ? (
                  <ThemedText type="caption" style={{ color: c.textSecondary }}>
                    {getCity(item.citta).label}
                  </ThemedText>
                ) : null}
              </View>
              <Button
                label="Scrivi"
                variant="secondary"
                size="md"
                onPress={() =>
                  router.push({ pathname: '/chat/direct/[userId]', params: { userId: item.id } } as never)
                }
              />
            </PressableScale>
          )}
          ListEmptyComponent={
            daRispondere.length === 0 ? (
              <EmptyState
                icon="smile"
                title="Ancora nessun amico"
                message="Aggiungi qualcuno dal suo profilo: si aggiunge quando accetta."
              />
            ) : null
          }
          ListFooterComponent={
            <View style={styles.piede}>
              {inAttesa.length > 0 ? (
                <View style={styles.sezione}>
                  <ThemedText type="label">IN ATTESA DI RISPOSTA</ThemedText>
                  {inAttesa.map((a) => (
                    <ThemedText key={a.id} style={{ color: c.textSecondary }}>
                      {a.nome}
                    </ThemedText>
                  ))}
                </View>
              ) : null}

              {/* Il suggerimento: gente con cui hai gia' fatto uno scambio. */}
              {daSuggerire.length > 0 ? (
                <View style={styles.sezione}>
                  <ThemedText type="label">QUESTE LE CONOSCI GIÀ</ThemedText>
                  <ThemedText type="caption" style={{ color: c.textSecondary }}>
                    Ci hai già fatto almeno un giro.
                  </ThemedText>
                  {daSuggerire.slice(0, 8).map((k) => (
                    <PressableScale
                      key={k.user.id}
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: k.user.id } } as never)}
                      style={[styles.riga, { backgroundColor: c.surface }]}>
                      <Avatar name={k.user.nome} uri={k.user.fotoUrl} size={40} />
                      <View style={styles.flex}>
                        <ThemedText type="defaultSemiBold">{k.user.nome}</ThemedText>
                        <ThemedText type="caption" style={{ color: c.textSecondary }}>
                          {k.scambi === 1 ? '1 giro insieme' : `${k.scambi} giri insieme`}
                        </ThemedText>
                      </View>
                    </PressableScale>
                  ))}
                </View>
              ) : null}
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeletons: { padding: Spacing.md, gap: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  testa: { gap: Spacing.sm },
  piede: { gap: Spacing.md, marginTop: Spacing.lg },
  sezione: { gap: Spacing.sm },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  flex: { flex: 1 },
});
