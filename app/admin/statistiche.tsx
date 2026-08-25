import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { GraficoBarre, type Barra } from '@/components/grafico-barre';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Radii, Spacing } from '@/constants/theme';
import {
  adminAndamento,
  adminImbuto,
  adminPerFasciaOraria,
  type GiornoAndamento,
  type Imbuto,
} from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';

/**
 * COME STA ANDANDO DAVVERO.
 *
 * Il pannello mostrava numeri singoli: 12 utenti, 3 giri aperti. Un numero da
 * solo non dice se le cose vanno meglio o peggio - per quello serve la serie
 * nel tempo, e i giorni a zero devono vedersi come zero.
 *
 * La cosa piu' importante qui non e' un grafico: e' l'imbuto. Quante persone
 * invitate si sono iscritte, e quante di quelle hanno fatto ALMENO UN GIRO.
 * Chi si iscrive e poi non fa mai niente non e' un utente: e' un numero che
 * consola e basta, e con cinquanta inviti da bruciare consolarsi costa caro.
 */

const PERIODI = [7, 30];

export default function AdminStatisticheScreen() {
  const c = useColors();
  const [giorni, setGiorni] = useState(30);
  const [andamento, setAndamento] = useState<GiornoAndamento[]>([]);
  const [ore, setOre] = useState<{ ora: number; giri: number }[]>([]);
  const [imbuto, setImbuto] = useState<Imbuto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [a, o, i] = await Promise.all([adminAndamento(giorni), adminPerFasciaOraria(), adminImbuto()]);
        setAndamento(a);
        setOre(o);
        setImbuto(i);
        setError(null);
      } catch (e) {
        setError(messaggioServer(e, 'Statistiche non disponibili o permessi insufficienti.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [giorni],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** «04/09» -> «4/9», corto abbastanza da starci sotto una barra. */
  const giornoBreve = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const passo = giorni > 10 ? 5 : 1;
  const serie = (campo: keyof GiornoAndamento): Barra[] =>
    andamento.map((g) => ({ etichetta: giornoBreve(g.giorno), valore: Number(g[campo]) }));

  const creati = andamento.reduce((s, g) => s + g.giriCreati, 0);
  const conclusi = andamento.reduce((s, g) => s + g.giriConclusi, 0);
  const annullati = andamento.reduce((s, g) => s + g.giriAnnullati, 0);
  const riuscita = creati > 0 ? Math.round((conclusi / creati) * 100) : null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Statistiche' }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger }}>{error}</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={c.accent} />
          }>
          <View style={styles.chips}>
            {PERIODI.map((p) => (
              <Chip key={p} label={`${p} giorni`} active={giorni === p} onPress={() => setGiorni(p)} />
            ))}
          </View>

          {/* L'IMBUTO, per primo: e' la misura che conta. */}
          {imbuto ? (
            <View style={[styles.riquadro, { backgroundColor: c.surface }]}>
              <ThemedText type="label">DALL INVITO AL PRIMO GIRO</ThemedText>
              <Passo etichetta="Inviti creati" valore={imbuto.invitiCreati} massimo={imbuto.invitiCreati} />
              <Passo etichetta="Inviti usati" valore={imbuto.invitiUsati} massimo={imbuto.invitiCreati} />
              <Passo etichetta="Iscritti" valore={imbuto.iscritti} massimo={imbuto.invitiCreati} />
              <Passo etichetta="Hanno chiesto almeno un giro" valore={imbuto.hannoChiesto} massimo={imbuto.iscritti} />
              <Passo etichetta="Hanno portato almeno un giro" valore={imbuto.hannoPortato} massimo={imbuto.iscritti} />
              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {imbuto.iscritti > 0 && imbuto.hannoPortato === 0
                  ? 'Nessuno ha ancora portato niente: senza chi porta, l app non funziona. E il numero da guardare.'
                  : 'Chi si iscrive e non fa mai niente non conta come utente.'}
              </ThemedText>
            </View>
          ) : null}

          <View style={[styles.riquadro, { backgroundColor: c.surface }]}>
            <ThemedText type="label">{`ULTIMI ${giorni} GIORNI`}</ThemedText>
            <Riga etichetta="Giri lanciati" valore={`${creati}`} />
            <Riga etichetta="Giri conclusi" valore={`${conclusi}`} />
            <Riga etichetta="Giri annullati" valore={`${annullati}`} danger={annullati > conclusi} />
            <Riga
              etichetta="Vanno a buon fine"
              valore={riuscita == null ? '-' : `${riuscita}%`}
              danger={riuscita != null && riuscita < 50}
            />
          </View>

          <GraficoBarre
            titolo="GIRI LANCIATI"
            sottotitolo="Quante volte qualcuno ha chiesto delle birre"
            dati={serie('giriCreati')}
            passoEtichette={passo}
          />
          <GraficoBarre
            titolo="GIRI CONCLUSI"
            sottotitolo="Quanti sono arrivati fino alla conferma"
            dati={serie('giriConclusi')}
            passoEtichette={passo}
          />
          <GraficoBarre
            titolo="NUOVI ISCRITTI"
            dati={serie('iscritti')}
            passoEtichette={passo}
          />
          <GraficoBarre
            titolo="BEERCOIN PASSATI DI MANO"
            sottotitolo="Non sono BeerCoin creati: chi chiede paga, chi porta incassa"
            dati={serie('creditiScambiati')}
            passoEtichette={passo}
          />
          <GraficoBarre
            titolo="A CHE ORA SI CHIEDE"
            sottotitolo="Ultimi 30 giorni, per ora del giorno"
            dati={ore.map((o) => ({
              etichetta: `${o.ora}`,
              valore: o.giri,
              evidenzia: o.ora >= 21 || o.ora <= 1,
            }))}
            passoEtichette={3}
          />
        </ScrollView>
      )}
    </ThemedView>
  );
}

/** Una riga dell'imbuto, con la barra proporzionale al passo precedente. */
function Passo({ etichetta, valore, massimo }: { etichetta: string; valore: number; massimo: number }) {
  const c = useColors();
  const quota = massimo > 0 ? valore / massimo : 0;
  return (
    <View style={styles.passo}>
      <View style={styles.passoTesto}>
        <ThemedText style={styles.flex}>{etichetta}</ThemedText>
        <ThemedText type="defaultSemiBold">{valore}</ThemedText>
      </View>
      <View style={[styles.barraSfondo, { backgroundColor: c.surfaceAlt }]}>
        <View
          style={[
            styles.barraPiena,
            { width: `${Math.min(100, Math.round(quota * 100))}%`, backgroundColor: c.accent },
          ]}
        />
      </View>
    </View>
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
  chips: { flexDirection: 'row', gap: Spacing.sm },
  riquadro: { borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm },
  riga: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  passo: { gap: 4 },
  passoTesto: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  barraSfondo: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barraPiena: { height: 8, borderRadius: 4 },
});
