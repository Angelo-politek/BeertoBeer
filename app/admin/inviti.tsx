import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Clipboard, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { SkeletonCard } from '@/components/skeleton';
import { TestoModal } from '@/components/testo-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { adminCreaInvito, adminInviti, adminRevocaInvito, type AdminInvito } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { formatShortDate } from '@/lib/format';

type Filtro = 'liberi' | 'usati' | 'ritirati';

/**
 * GLI INVITI, PER CHI TIENE LA BETA.
 *
 * L'invito è il cancello: si entra solo così, e ognuno ne ha uno. Ma durante
 * una beta servono eccezioni — seminare un quartiere, sostituire un codice
 * finito alla persona sbagliata, rimediare a un errore — e finora non c'era
 * modo di farne uno né di ritirarlo.
 *
 * Ritirare non cancella la riga: la marca. Chi prova a usare un codice
 * ritirato deve leggere che è stato ritirato, non «codice inesistente» — che
 * sembra un errore di battitura e fa riprovare tre volte prima di rinunciare.
 */
export default function AdminInvitiScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [righe, setRighe] = useState<AdminInvito[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('liberi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [nuovoAperto, setNuovoAperto] = useState(false);
  const [daRitirare, setDaRitirare] = useState<AdminInvito | null>(null);
  const [ritirando, setRitirando] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setRighe(await adminInviti());
      setErrore(null);
    } catch (e) {
      setErrore(messaggioServer(e, 'Elenco non disponibile o permessi insufficienti.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibili = righe.filter((r) =>
    filtro === 'usati' ? r.usatoIl : filtro === 'ritirati' ? r.revocatoIl : !r.usatoIl && !r.revocatoIl,
  );

  async function crea(nominativo: string) {
    setCreando(true);
    try {
      const code = await adminCreaInvito(undefined, nominativo);
      setNuovoAperto(false);
      Clipboard.setString(code);
      toast.show(`${code} — copiato.`);
      await load(true);
    } catch (e) {
      Alert.alert('Non creato', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setCreando(false);
    }
  }

  async function ritira(inv: AdminInvito, motivo: string) {
    setRitirando(true);
    try {
      await adminRevocaInvito(inv.code, motivo);
      setDaRitirare(null);
      toast.show('Ritirato. Non vale più.');
      await load(true);
    } catch (e) {
      Alert.alert('Non ritirato', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setRitirando(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Inviti' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
        <Button label="Crea un invito" onPress={() => setNuovoAperto(true)} loading={creando} />
        <ThemedText type="caption" style={{ color: c.textSecondary }}>
          Ne esce un codice, già copiato. Vale come tutti gli altri: una persona sola.
        </ThemedText>

        <View style={styles.filtri}>
          <Chip label="Liberi" active={filtro === 'liberi'} onPress={() => setFiltro('liberi')} />
          <Chip label="Spesi" active={filtro === 'usati'} onPress={() => setFiltro('usati')} />
          <Chip label="Ritirati" active={filtro === 'ritirati'} onPress={() => setFiltro('ritirati')} />
        </View>

        {loading ? (
          <SkeletonCard />
        ) : errore ? (
          <EmptyState
            icon="x-mark"
            title="Elenco non disponibile"
            message={errore}
            actionLabel="Riprova"
            onAction={() => load(true)}
          />
        ) : visibili.length === 0 ? (
          <EmptyState
            icon="bottle"
            title={filtro === 'liberi' ? 'Nessun invito libero' : filtro === 'usati' ? 'Nessuno è ancora entrato' : 'Nessun invito ritirato'}
            message={
              filtro === 'liberi'
                ? 'Ogni persona ne riceve uno alla registrazione. Qui restano quelli non ancora spesi.'
                : filtro === 'usati'
                  ? 'Quando qualcuno entra con un codice, compare qui insieme a chi glielo ha dato.'
                  : 'Un invito ritirato resta visibile: chi prova a usarlo legge che non vale più.'
            }
            actionLabel="Aggiorna"
            onAction={() => load(true)}
          />
        ) : (
          visibili.map((r) => (
            <View key={r.code} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.riga}>
                <ThemedText type="subtitle" style={{ color: r.revocatoIl ? c.textSecondary : c.accent }}>
                  {r.code}
                </ThemedText>
                {r.daAdmin ? <Badge label="Creato qui" tone="neutral" /> : null}
                {r.revocatoIl ? <Badge label="Ritirato" tone="danger" /> : null}
              </View>

              {r.nominativo ? (
                <ThemedText>Per {r.nominativo}</ThemedText>
              ) : (
                <ThemedText style={{ color: c.textSecondary }}>Senza nome</ThemedText>
              )}

              <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.inviterId } })}>
                <ThemedText style={{ color: c.accent }}>Di {r.inviterNome}</ThemedText>
              </Pressable>

              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {r.usatoIl
                  ? `Speso il ${formatShortDate(r.usatoIl)}${r.invitatoNome ? ` — è entrato ${r.invitatoNome}` : ''}`
                  : r.revocatoIl
                    ? `Ritirato il ${formatShortDate(r.revocatoIl)}`
                    : `Creato il ${formatShortDate(r.creatoIl)}`}
              </ThemedText>

              {!r.usatoIl && !r.revocatoIl ? (
                <View style={styles.azioni}>
                  <Button
                    label="Copia"
                    variant="secondary"
                    onPress={() => {
                      Clipboard.setString(r.code);
                      toast.show('Codice copiato.');
                    }}
                    style={styles.meta}
                  />
                  <Button label="Ritira" variant="danger" onPress={() => setDaRitirare(r)} style={styles.meta} />
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <TestoModal
        visible={nuovoAperto}
        titolo="A chi lo dai?"
        spiegazione="Scrivi un nome: serve a ricordarti a chi era destinato, e finisce nel registro delle azioni."
        placeholder="Il suo nome"
        etichettaConferma="Crea"
        minimo={1}
        loading={creando}
        onClose={() => setNuovoAperto(false)}
        onSubmit={crea}
      />

      <TestoModal
        visible={daRitirare != null}
        titolo="Perché lo ritiri?"
        spiegazione="Chi prova a usarlo leggerà che è stato ritirato. La motivazione resta scritta."
        placeholder="Es. mandato per errore alla persona sbagliata"
        etichettaConferma="Ritira"
        minimo={5}
        pericolo
        loading={ritirando}
        onClose={() => setDaRitirare(null)}
        onSubmit={(testo) => {
          if (daRitirare) void ritira(daRitirare, testo);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  filtri: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, gap: 5 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  azioni: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  meta: { flex: 1 },
});
