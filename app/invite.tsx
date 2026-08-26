import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Clipboard, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TesseraInvito } from '@/components/tessera-invito';
import { TestoModal } from '@/components/testo-modal';
import { useToast } from '@/components/toast';
import { APK_URL } from '@/constants/branding';
import { INGRESSO, VOCE } from '@/constants/testi';
import { Fonts, Spacing } from '@/constants/theme';
import { getMyInvites, nominaInvito } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { useCity } from '@/lib/city-context';
import { messaggioServer } from '@/lib/errori';
import { REWARDS } from '@/lib/credits';
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
  const { city } = useCity();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [daNominare, setDaNominare] = useState<Invite | null>(null);
  const [salvando, setSalvando] = useState(false);
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

  async function condividi(code: string, nominativo?: string) {
    // Nel messaggio ci vanno due sole cose: il codice e dove scaricare l'app.
    // C'era anche un link beertobeer://, ma è una riga che confonde e basta:
    // chi riceve un invito non ha ancora l'app, e chi ce l'ha è già dentro.
    // (Il link continua a funzionare se qualcuno lo apre: non lo proponiamo più.)
    try {
      await Share.share({
        message: INGRESSO.invito.messaggio(
          code,
          nominativo,
          city.label,
          session?.user.user_metadata?.nome ?? INGRESSO.invito.mittenteIgnoto,
          APK_URL,
        ),
      });
    } catch {
      toast.show(INGRESSO.invito.condivisioneFallita, 'error');
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: INGRESSO.invito.titolo }} />
        <View style={styles.center}><ActivityIndicator color={c.accent} /></View>
      </ThemedView>
    );
  }

  const liberi = invites.filter((i) => !i.usato);
  const usati = invites.filter((i) => i.usato);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: INGRESSO.invito.titolo }} />
      {/* ScrollView e non View: con i caratteri di sistema ingranditi il
          contenuto non ci sta in altezza e senza scorrimento resta tagliato. */}
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <EmptyState
            icon="x-mark"
            title={INGRESSO.invito.nonDisponibiliTitolo}
            message={INGRESSO.invito.nonDisponibiliTesto}
          />
        ) : (
          <>
            <View>
              <ThemedText type="label">{INGRESSO.invito.occhiello}</ThemedText>
              <ThemedText type="title">{INGRESSO.invito.quanti(liberi.length)}</ThemedText>
              <ThemedText style={[styles.intro, { color: c.textSecondary }]}>
                {INGRESSO.invito.intro}
              </ThemedText>
            </View>

            <Card style={styles.nota}>
              <ThemedText type="defaultSemiBold">{INGRESSO.invito.aChiDarloTitolo}</ThemedText>
              <ThemedText style={{ color: c.textSecondary, lineHeight: 22 }}>
                {INGRESSO.invito.aChiDarloTesto}
              </ThemedText>
            </Card>

            {liberi.map((inv) => (
              <View key={inv.code} style={styles.blocco}>
                <TesseraInvito invito={inv} onPress={() => setDaNominare(inv)} />
                <Button
                  label={inv.nominativo ? INGRESSO.invito.cambiaNome : INGRESSO.invito.scriviNome}
                  variant="secondary"
                  onPress={() => setDaNominare(inv)}
                />
                <Button
                  label={INGRESSO.invito.copiaCodice}
                  variant="secondary"
                  onPress={() => {
                    Clipboard.setString(inv.code);
                    toast.show(INGRESSO.invito.codiceCopiato);
                  }}
                />
                <Button label={INGRESSO.invito.condividi} onPress={() => condividi(inv.code, inv.nominativo)} />
                <ThemedText type="caption" style={{ color: c.textSecondary }}>
                  {INGRESSO.invito.premio(REWARDS.referral)}
                </ThemedText>
              </View>
            ))}

            {usati.length > 0 ? (
              <View style={styles.blocco}>
                <ThemedText type="label">{INGRESSO.invito.portatiDentro}</ThemedText>
                {usati.map((inv) => (
                  <TesseraInvito key={inv.code} invito={inv} />
                ))}
              </View>
            ) : null}

            {liberi.length === 0 && usati.length > 0 ? (
              <ThemedText style={{ color: c.textSecondary }}>
                {INGRESSO.invito.speso}
              </ThemedText>
            ) : null}
          </>
        )}
      </ScrollView>

      <TestoModal
        visible={daNominare != null}
        titolo={INGRESSO.invito.nominaTitolo}
        spiegazione={INGRESSO.invito.nominaSpiegazione}
        placeholder={INGRESSO.invito.nominaSegnaposto}
        etichettaConferma={INGRESSO.invito.nominaConferma}
        minimo={1}
        loading={salvando}
        onClose={() => setDaNominare(null)}
        onSubmit={async (testo) => {
          if (!daNominare) return;
          setSalvando(true);
          try {
            await nominaInvito(daNominare.code, testo);
            setDaNominare(null);
            await load();
          } catch (e) {
            toast.show(messaggioServer(e, VOCE.riserva.nonSalvato), 'error');
          } finally {
            setSalvando(false);
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  blocco: { gap: Spacing.sm },
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { marginTop: Spacing.xs, lineHeight: 22 },
  nota: { gap: Spacing.xs },
  codeCard: { gap: Spacing.sm, alignItems: 'center' },
  code: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: 2 },
});
