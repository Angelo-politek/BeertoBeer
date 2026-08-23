import * as Linking from 'expo-linking';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Fonts, Spacing } from '@/constants/theme';
import { getMyInvites } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import type { Invite } from '@/types';

/**
 * I tuoi inviti.
 *
 * In Beer to Beer si entra solo su invito e ognuno ne ha UNO. La schermata è
 * costruita attorno a questo: non è una funzione di crescita da spingere, è una
 * scelta da far pesare. Per questo il codice non si mostra prima di aver detto
 * cosa comporta, e il testo condiviso lo ripete a chi lo riceve.
 */
export default function InviteScreen() {
  const c = useColors();
  const toast = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setInvites(await getMyInvites());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function condividi(code: string) {
    // Il link apre direttamente la registrazione col codice già scritto, ma
    // funziona solo a app installata: per questo il messaggio contiene sempre
    // anche il codice in chiaro.
    const link = Linking.createURL('/register', { queryParams: { invito: code } });
    try {
      await Share.share({
        message:
          `Ti porto dentro Beer to Beer.\n\n` +
          `È una community di Torino dove ci si porta le birre a vicenda tra vicini: nessuno ci guadagna, chi porta viene rimborsato della spesa e riceve BeerCoin che valgono solo dentro l'app.\n\n` +
          `Si entra solo su invito e io ne avevo uno. Ho scelto te.\n\n` +
          `Il tuo codice: ${code}\n\n` +
          `Se hai già l'app: ${link}`,
      });
    } catch {
      toast.show('Non sono riuscito ad aprire la condivisione.', 'error');
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Il tuo invito' }} />
        <View style={styles.center}><ActivityIndicator color={c.accent} /></View>
      </ThemedView>
    );
  }

  const liberi = invites.filter((i) => !i.usato);
  const usati = invites.filter((i) => i.usato);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Il tuo invito' }} />
      {/* ScrollView e non View: con i caratteri di sistema ingranditi il
          contenuto non ci sta in altezza e senza scorrimento resta tagliato. */}
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <EmptyState icon="x-mark" title="Inviti non disponibili" message="Controlla la connessione e riprova." />
        ) : (
          <>
            <View>
              <ThemedText type="label">COME SI ENTRA</ThemedText>
              <ThemedText type="title">
                {liberi.length === 0 ? 'HAI GIÀ SCELTO' : liberi.length === 1 ? 'HAI UN INVITO' : `HAI ${liberi.length} INVITI`}
              </ThemedText>
              <ThemedText style={[styles.intro, { color: c.textSecondary }]}>
                In Beer to Beer si entra solo se qualcuno ti porta dentro. Per questo qui non
                troverai un pulsante “invita tutti”: hai un posto solo, e quando lo usi è speso.
              </ThemedText>
            </View>

            <Card style={styles.nota}>
              <ThemedText type="defaultSemiBold">A chi darlo</ThemedText>
              <ThemedText style={{ color: c.textSecondary, lineHeight: 22 }}>
                A qualcuno che vive la tua zona e che ti farebbe piacere incontrare sul pianerottolo
                alle undici di sera. Questa community regge finché le persone dentro si comportano
                bene: ogni invito è una tua garanzia su chi entra.
              </ThemedText>
            </Card>

            {liberi.map((inv) => (
              <Card key={inv.code} style={styles.codeCard}>
                <ThemedText type="label">IL TUO CODICE</ThemedText>
                <ThemedText style={[styles.code, { color: c.accentStrong }]}>{inv.code}</ThemedText>
                <ThemedText type="caption">
                  Quando chi inviti completa il suo primo giro, ricevete 5 BeerCoin a testa.
                </ThemedText>
                <Button label="Condividi l’invito" onPress={() => condividi(inv.code)} />
              </Card>
            ))}

            {usati.length > 0 ? (
              <Card style={styles.nota}>
                <ThemedText type="defaultSemiBold">Chi hai portato dentro</ThemedText>
                {usati.map((inv) => (
                  <ThemedText key={inv.code} style={{ color: c.textSecondary }}>
                    {inv.invitato ?? 'Qualcuno'}
                    {inv.usedAt ? ` · ${formatShortDate(inv.usedAt)}` : ''}
                  </ThemedText>
                ))}
              </Card>
            ) : null}

            {liberi.length === 0 && usati.length > 0 ? (
              <ThemedText style={{ color: c.textSecondary }}>
                Il tuo invito è stato speso. Non ne arrivano altri: è così per tutti.
              </ThemedText>
            ) : null}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { marginTop: Spacing.xs, lineHeight: 22 },
  nota: { gap: Spacing.xs },
  codeCard: { gap: Spacing.sm, alignItems: 'center' },
  code: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: 2 },
});
