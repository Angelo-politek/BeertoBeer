import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { NOVITA } from '@/constants/novita';
import { SISTEMA } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { haGiaVistoUnaVersione, ritiraAggiornamentoApplicato } from '@/lib/preferences';

/**
 * «L'APP E' CAMBIATA, ED ECCO COSA».
 *
 * Compare una volta sola, in cima alla schermata iniziale, dopo che un
 * aggiornamento e' stato applicato. Poi sparisce e non torna.
 *
 * DUE GUARDIE, ED E' IL PUNTO DELICATO.
 *
 * 1. Il ricordo dell'aggiornamento viene da AsyncStorage, non dalla memoria:
 *    Updates.reloadAsync() riavvia l'app e cancella ogni stato React. Il flag
 *    lo scrive il root layout PRIMA di riavviare (lib/preferences.ts).
 *
 * 2. Chi ha appena installato l'app NON deve vederlo. Senza questa guardia, la
 *    prima cosa che legge una persona invitata sarebbe l'elenco delle
 *    correzioni di un'app che non ha mai usato — che e' un modo bizzarro di
 *    presentarsi. `haGiaVistoUnaVersione` risponde `false` alla prima apertura
 *    in assoluto, e da li' in poi `true`.
 */
export function NovitaBanner() {
  const c = useColors();
  const [mostra, setMostra] = useState(false);
  const [aperto, setAperto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const versione = Constants.expoConfig?.version ?? 'sconosciuta';
      const [aggiornato, giaVista] = await Promise.all([
        ritiraAggiornamentoApplicato(),
        haGiaVistoUnaVersione(versione),
      ]);
      if (vivo && aggiornato && giaVista) setMostra(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const ultime = NOVITA[0];
  if (!mostra || !ultime) return null;

  return (
    <Pressable
      onPress={() => setAperto((v) => !v)}
      style={[styles.banner, { backgroundColor: c.surfaceAlt, borderColor: c.accent }]}>
      <View style={styles.riga}>
        <ThemedText type="label" style={{ color: c.accent, flex: 1 }}>{SISTEMA.novitaBanner.intestazione}</ThemedText>
        <ThemedText style={{ color: c.textSecondary }}>{aperto ? SISTEMA.novitaBanner.nascondi : SISTEMA.novitaBanner.apri}</ThemedText>
      </View>

      {aperto ? (
        <View style={styles.elenco}>
          {ultime.righe.map((riga) => (
            <ThemedText key={riga} style={{ color: c.textSecondary }}>· {riga}</ThemedText>
          ))}
          <Pressable onPress={() => setMostra(false)} hitSlop={8}>
            <ThemedText style={{ color: c.accent }}>{SISTEMA.novitaBanner.hoCapito}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <ThemedText style={{ color: c.textSecondary }}>
          {SISTEMA.novitaBanner.quante(ultime.righe.length)}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: 4,
  },
  riga: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  elenco: { gap: 6, marginTop: 4 },
});
