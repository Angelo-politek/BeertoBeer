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
/**
 * IL MESSAGGIO CHE ESCE DALL'APP.
 *
 * È l'unico testo di Beer to Beer che una persona legge PRIMA di avere l'app,
 * e finora era un blocco anonimo: non diceva chi lo mandava — «ti porto
 * dentro», ma chi? — né a chi era destinato, mentre la schermata prometteva
 * «ho scelto te». Su WhatsApp, un testo così somiglia a una catena di
 * Sant'Antonio, che è esattamente il contrario di quello che è.
 *
 * E diceva «community di Torino» scritto a mano, in un'app che ha quattro
 * città: chi invitava da Milano mandava un messaggio falso.
 */
function messaggioInvito(
  code: string,
  nominativo: string | undefined,
  citta: string,
  mittente: string,
): string {
  return [
    nominativo ? `${nominativo}, ti porto dentro Beer to Beer.` : 'Ti porto dentro Beer to Beer.',
    '',
    `È una community di ${citta}: ci si porta le birre a vicenda fra chi abita vicino. Nessuno ci guadagna niente. Chi porta si fa rimborsare la spesa e prende BeerCoin, che valgono solo qui dentro e non diventano soldi.`,
    '',
    'Si entra solo su invito e ognuno ne ha uno. Il mio l’ho dato a te.',
    '',
    `Il tuo codice: ${code}`,
    APK_URL ? `L’app: ${APK_URL}` : 'Chiedimi il link per scaricarla.',
    '',
    `— ${mittente}`,
  ].join('\n');
}

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
        message: messaggioInvito(code, nominativo, city.label, session?.user.user_metadata?.nome ?? 'un amico'),
      });
    } catch {
      toast.show('La condivisione non si è aperta. Riprova.', 'error');
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
              <View key={inv.code} style={styles.blocco}>
                <TesseraInvito invito={inv} onPress={() => setDaNominare(inv)} />
                <Button
                  label={inv.nominativo ? 'Cambia il nome' : 'Scrivi a chi lo dai'}
                  variant="secondary"
                  onPress={() => setDaNominare(inv)}
                />
                <Button
                  label="Copia il codice"
                  variant="secondary"
                  onPress={() => {
                    Clipboard.setString(inv.code);
                    toast.show('Codice copiato.');
                  }}
                />
                <Button label="Condividi l’invito" onPress={() => condividi(inv.code, inv.nominativo)} />
                <ThemedText type="caption" style={{ color: c.textSecondary }}>
                  {`Quando chi inviti chiude il suo primo giro, prendete ${REWARDS.referral} BeerCoin a testa.`}
                </ThemedText>
              </View>
            ))}

            {usati.length > 0 ? (
              <View style={styles.blocco}>
                <ThemedText type="label">CHI HAI PORTATO DENTRO</ThemedText>
                {usati.map((inv) => (
                  <TesseraInvito key={inv.code} invito={inv} />
                ))}
              </View>
            ) : null}

            {liberi.length === 0 && usati.length > 0 ? (
              <ThemedText style={{ color: c.textSecondary }}>
                Il tuo invito è stato speso. Non ne arrivano altri: è così per tutti.
              </ThemedText>
            ) : null}
          </>
        )}
      </ScrollView>

      <TestoModal
        visible={daNominare != null}
        titolo="A chi lo dai?"
        spiegazione="Serve solo a scrivere il messaggio e a ricordartelo. Non lo vede nessun altro."
        placeholder="Il suo nome"
        etichettaConferma="Salva"
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
            toast.show(messaggioServer(e, 'Non è stato salvato.'), 'error');
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
