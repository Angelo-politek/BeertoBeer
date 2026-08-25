import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

/**
 * UN GRAFICO A BARRE, SENZA LIBRERIE.
 *
 * Segnalazione del collaudo: «voglio anche tutta una parte di statistiche e
 * grafici perche' sono un ingegnere autistico».
 *
 * PERCHE' DISEGNATO A MANO. La libreria naturale sarebbe react-native-svg, ma
 * non e' installata e contiene codice nativo: aggiungerla vorrebbe dire un APK
 * nuovo e farlo reinstallare a tutti quelli che hanno gia' l'app. Per delle
 * barre non vale la pena. Delle View con un'altezza fanno esattamente lo
 * stesso lavoro e continuano ad arrivare via etere.
 *
 * UNA REGOLA DI ONESTA': la scala parte SEMPRE da zero. Un grafico che parte
 * da un valore qualsiasi fa sembrare enorme una differenza minima, ed e' il
 * modo piu' comune di mentire con un grafico senza scrivere un numero falso.
 */

export type Barra = {
  /** Etichetta sotto la barra. Corta: sotto ci sta poco. */
  etichetta: string;
  valore: number;
  /** Etichetta piu' lunga, mostrata solo su alcune barre per non affollare. */
  etichettaEstesa?: string;
  evidenzia?: boolean;
};

type Props = {
  titolo: string;
  sottotitolo?: string;
  dati: Barra[];
  altezza?: number;
  /** Ogni quante barre mostrare l'etichetta (con 30 giorni non ci stanno tutte). */
  passoEtichette?: number;
  unita?: string;
};

export function GraficoBarre({
  titolo,
  sottotitolo,
  dati,
  altezza = 120,
  passoEtichette = 1,
  unita = '',
}: Props) {
  const c = useColors();
  const massimo = Math.max(1, ...dati.map((d) => d.valore));
  const totale = dati.reduce((s, d) => s + d.valore, 0);

  return (
    <View style={[styles.riquadro, { backgroundColor: c.surface }]}>
      <View style={styles.intestazione}>
        <View style={styles.flex}>
          <ThemedText type="label">{titolo}</ThemedText>
          {sottotitolo ? (
            <ThemedText type="caption" style={{ color: c.textSecondary }}>
              {sottotitolo}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="defaultSemiBold">{`${totale}${unita}`}</ThemedText>
      </View>

      {totale === 0 ? (
        <ThemedText style={{ color: c.textSecondary, paddingVertical: Spacing.md }}>
          Ancora niente da mostrare qui.
        </ThemedText>
      ) : (
        <>
          <View style={[styles.barre, { height: altezza }]}>
            {dati.map((d, i) => (
              <View key={`${d.etichetta}-${i}`} style={styles.colonna}>
                <View
                  style={[
                    styles.barra,
                    {
                      // Sempre da zero, e sempre almeno due pixel: una barra a
                      // zero deve vedersi come "zero", non sparire.
                      height: d.valore === 0 ? 2 : Math.max(2, (d.valore / massimo) * altezza),
                      backgroundColor: d.evidenzia ? c.accent : d.valore === 0 ? c.border : c.accentStrong,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.etichette}>
            {dati.map((d, i) => (
              <View key={`e-${d.etichetta}-${i}`} style={styles.colonna}>
                <ThemedText style={[styles.etichetta, { color: c.textSecondary }]} numberOfLines={1}>
                  {i % passoEtichette === 0 ? d.etichetta : ''}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.scala}>
            <ThemedText type="caption" style={{ color: c.textSecondary }}>
              0
            </ThemedText>
            <ThemedText type="caption" style={{ color: c.textSecondary }}>
              {`massimo ${massimo}`}
            </ThemedText>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  riquadro: { borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm },
  intestazione: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  flex: { flex: 1 },
  barre: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  colonna: { flex: 1, alignItems: 'center' },
  barra: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  etichette: { flexDirection: 'row', gap: 2 },
  etichetta: { fontSize: 9, textAlign: 'center' },
  scala: { flexDirection: 'row', justifyContent: 'space-between' },
});
