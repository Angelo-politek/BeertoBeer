import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ProvvedimentoModal } from '@/components/provvedimento-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Radii, Spacing } from '@/constants/theme';
import {
  adminProvvedimento,
  adminSchedaUtente,
  adminSuspendUser,
  type AdminSchedaUtente,
  type TipoProvvedimento,
} from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import { formatShortDate } from '@/lib/format';

/**
 * LA SCHEDA DI UNA PERSONA, DAL LATO DI CHI MODERA.
 *
 * Segnalazione del collaudo: «pannello amministrazione sezione utenti, devo
 * poter aprire il profilo dell'utente cliccandolo».
 *
 * Ma il problema piu' grosso non era il tocco mancante: era che PER DECIDERE
 * mancavano i precedenti. La terza volta che una persona viene segnalata non
 * e' come la prima, e non c'era modo di saperlo da nessuna parte. Qui ci sono
 * segnalazioni ricevute e fatte, provvedimenti gia' presi, giri annullati e
 * movimenti di BeerCoin: tutto in una schermata.
 *
 * Anche «segnalazioni FATTE» conta: chi ne fa dieci in una settimana o e'
 * incappato in una serie sfortunata, o le sta usando come arma.
 */

const MOTIVI: Record<string, string> = {
  unsafe: 'Non si e sentito al sicuro',
  person_absent: 'Non trova la persona',
  request_mismatch: 'Giro diverso dal concordato',
  comportamento_scorretto: 'Comportamento scorretto',
  ordine_falso: 'Ordine falso',
  molestie: 'Molestie',
  spam: 'Spam',
  sicurezza: 'Sicurezza',
  altro: 'Altro',
};

export default function AdminUtenteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [scheda, setScheda] = useState<AdminSchedaUtente | null>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [provvedimentoAperto, setProvvedimentoAperto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setScheda(await adminSchedaUtente(id));
      setErrore(null);
    } catch (e) {
      setErrore(messaggioServer(e, 'Scheda non disponibile o permessi insufficienti.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applica(scelta: { tipo: TipoProvvedimento; giorni?: number; motivo: string }) {
    setInCorso(true);
    try {
      await adminProvvedimento({ userId: id, tipo: scelta.tipo, giorni: scelta.giorni, motivo: scelta.motivo });
      setProvvedimentoAperto(false);
      toast.show('Provvedimento applicato');
      await load();
    } catch (e) {
      Alert.alert('Non riuscita', messaggioServer(e, 'Riprova.'));
    } finally {
      setInCorso(false);
    }
  }

  async function togliSospensione() {
    setInCorso(true);
    try {
      await adminSuspendUser(id, null);
      toast.show('Sospensione tolta');
      await load();
    } catch (e) {
      Alert.alert('Non riuscita', messaggioServer(e, 'Riprova.'));
    } finally {
      setInCorso(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Scheda' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (errore || !scheda) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Scheda' }} />
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger }}>{errore ?? 'Persona non trovata.'}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const sospeso = scheda.sospesoFino != null && new Date(scheda.sospesoFino).getTime() > Date.now();
  const conclusi = scheda.giriChiesti + scheda.giriPortati;
  // Un tasso di annullamento alto e' il segnale che precede quasi sempre le
  // segnalazioni: meglio vederlo prima che dopo.
  const quotaAnnullati = conclusi + scheda.giriAnnullati > 0
    ? Math.round((scheda.giriAnnullati / (conclusi + scheda.giriAnnullati)) * 100)
    : 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: scheda.nome }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intestazione}>
          <ThemedText type="title" style={styles.flex}>{scheda.nome}</ThemedText>
          {scheda.isAdmin ? <Badge label="Admin" tone="accent" /> : null}
          {sospeso ? <Badge label="Sospeso" tone="danger" /> : null}
        </View>

        <Card style={styles.card}>
          <Riga etichetta="Email" valore={scheda.email} />
          <Riga etichetta="Citta" valore={scheda.citta ?? 'non impostata'} />
          <Riga etichetta="Iscritto il" valore={formatShortDate(scheda.iscrittoIl)} />
          <Riga etichetta="Invitato da" valore={scheda.invitatoDa ?? 'nessuno'} />
          <Riga etichetta="BeerCoin" valore={`${scheda.crediti}`} />
          <Riga etichetta="Valutazione" valore={scheda.rating.toFixed(1)} />
          {sospeso ? (
            <Riga
              etichetta="Sospeso fino al"
              valore={formatShortDate(scheda.sospesoFino as string)}
              danger
            />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="label">COSA HA FATTO</ThemedText>
          <Riga etichetta="Giri chiesti" valore={`${scheda.giriChiesti}`} />
          <Riga etichetta="Giri portati a termine" valore={`${scheda.giriPortati}`} />
          <Riga
            etichetta="Giri annullati"
            valore={`${scheda.giriAnnullati}${quotaAnnullati > 0 ? ` (${quotaAnnullati}%)` : ''}`}
            danger={quotaAnnullati >= 40}
          />
        </Card>

        <Card style={styles.card}>
          <ThemedText type="label">SEGNALAZIONI</ThemedText>
          <Riga
            etichetta="Ricevute"
            valore={`${scheda.segnalazioniRicevute}`}
            danger={scheda.segnalazioniRicevute >= 3}
          />
          {/* Chi ne fa tante o e' molto sfortunato, o le usa come arma. */}
          <Riga etichetta="Fatte da lui" valore={`${scheda.segnalazioniFatte}`} danger={scheda.segnalazioniFatte >= 5} />
          {scheda.segnalazioni.length === 0 ? (
            <ThemedText style={{ color: c.textSecondary }}>Mai stata segnalata.</ThemedText>
          ) : (
            scheda.segnalazioni.map((s) => (
              <View key={s.id} style={[styles.voce, { borderTopColor: c.border }]}>
                <ThemedText style={styles.flex}>{MOTIVI[s.motivo ?? ''] ?? s.motivo ?? 'Segnalazione'}</ThemedText>
                <ThemedText style={{ color: s.gravita === 'alta' ? c.danger : c.textSecondary, fontSize: 12 }}>
                  {formatShortDate(s.quando)} · {s.stato}
                </ThemedText>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText type="label">PROVVEDIMENTI</ThemedText>
          {scheda.provvedimenti.length === 0 ? (
            <ThemedText style={{ color: c.textSecondary }}>Nessuno.</ThemedText>
          ) : (
            scheda.provvedimenti.map((p, i) => (
              <View key={`${p.quando}-${i}`} style={[styles.voceColonna, { borderTopColor: c.border }]}>
                <ThemedText type="defaultSemiBold">
                  {p.tipo} · {formatShortDate(p.quando)}
                </ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>{p.motivo}</ThemedText>
              </View>
            ))
          )}
        </Card>

        {scheda.movimentiCrediti.length > 0 ? (
          <Card style={styles.card}>
            <ThemedText type="label">ULTIMI BEERCOIN</ThemedText>
            {scheda.movimentiCrediti.slice(0, 10).map((m, i) => (
              <View key={`${m.quando}-${i}`} style={styles.riga}>
                <ThemedText style={{ color: c.textSecondary }}>
                  {m.motivo} · {formatShortDate(m.quando)}
                </ThemedText>
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: m.delta >= 0 ? c.positive : c.danger }}>
                  {m.delta > 0 ? `+${m.delta}` : `${m.delta}`}
                </ThemedText>
              </View>
            ))}
          </Card>
        ) : null}

        <Button
          label="Apri il profilo pubblico"
          variant="secondary"
          onPress={() => router.push({ pathname: '/user/[id]', params: { id } })}
        />
        {sospeso ? (
          <Button label="Togli la sospensione" variant="secondary" loading={inCorso} onPress={togliSospensione} />
        ) : null}
        <Button
          label="Provvedimento"
          variant="danger"
          onPress={() => setProvvedimentoAperto(true)}
        />
      </ScrollView>

      <ProvvedimentoModal
        visible={provvedimentoAperto}
        nomePersona={scheda.nome}
        loading={inCorso}
        onClose={() => setProvvedimentoAperto(false)}
        onSubmit={applica}
      />
    </ThemedView>
  );
}

function Riga({ etichetta, valore, danger }: { etichetta: string; valore: string; danger?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.riga}>
      <ThemedText style={{ color: c.textSecondary }}>{etichetta}</ThemedText>
      <ThemedText type="defaultSemiBold" style={danger ? { color: c.danger } : undefined}>
        {valore}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intestazione: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  card: { gap: Spacing.xs, borderRadius: Radii.md },
  riga: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  voce: { flexDirection: 'row', gap: Spacing.sm, borderTopWidth: 1, paddingTop: Spacing.xs, marginTop: Spacing.xs },
  voceColonna: { gap: 2, borderTopWidth: 1, paddingTop: Spacing.xs, marginTop: Spacing.xs },
});
