import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { velo } from '@/constants/motion';
import { ADMIN, VOCE } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { TipoProvvedimento } from '@/data/api';
import Animated from 'react-native-reanimated';

/**
 * LA SCALA DEI PROVVEDIMENTI.
 *
 * Segnalazione del collaudo: «al momento le uniche segnalazioni gestibili sono
 * punibili con una sospensione di 48 ore. Servono piu' tipi di ammonizioni».
 *
 * Le 48 ore erano scritte a mano nella schermata — il database accettava gia'
 * qualsiasi scadenza, la rigidita' era tutta nell'interfaccia. Con una pena
 * sola chi modera ha due scelte entrambe sbagliate: punire troppo un
 * malinteso, o non fare niente davanti a qualcosa di serio.
 *
 * La motivazione e' OBBLIGATORIA perche' la legge anche chi la riceve: un
 * provvedimento senza spiegazione non insegna niente e sembra un sopruso.
 */

type Props = {
  visible: boolean;
  nomePersona: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (scelta: { tipo: TipoProvvedimento; giorni?: number; motivo: string }) => void;
};

const GIORNI = [1, 3, 7, 30];

export function ProvvedimentoModal({ visible, nomePersona, loading, onClose, onSubmit }: Props) {
  const c = useColors();
  const [tipo, setTipo] = useState<TipoProvvedimento>('avvertimento');
  const [giorni, setGiorni] = useState(1);
  const [motivo, setMotivo] = useState('');

  const motivoCorto = motivo.trim().length < 5;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={velo} style={[styles.velo, { backgroundColor: c.overlay }]}>
        <ThemedView style={[styles.foglio, { backgroundColor: c.surface }]}>
          <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Provvedimento per {nomePersona}</ThemedText>

            <View style={styles.gruppo}>
              <ThemedText type="label">{ADMIN.provvedimento.cosaFare}</ThemedText>
              <View style={styles.chips}>
                <Chip label={ADMIN.provvedimento.avvertimento} active={tipo === 'avvertimento'} onPress={() => setTipo('avvertimento')} />
                <Chip label={ADMIN.provvedimento.sospensione} active={tipo === 'sospensione'} onPress={() => setTipo('sospensione')} />
                <Chip label={ADMIN.provvedimento.esclusione} active={tipo === 'esclusione'} onPress={() => setTipo('esclusione')} />
              </View>
              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {tipo === 'avvertimento'
                  ? ADMIN.provvedimento.avvertimentoTesto
                  : tipo === 'sospensione'
                    ? ADMIN.provvedimento.sospensioneTesto
                    : ADMIN.provvedimento.esclusioneTesto}
              </ThemedText>
            </View>

            {tipo === 'sospensione' ? (
              <View style={styles.gruppo}>
                <ThemedText type="label">{ADMIN.provvedimento.perQuanto}</ThemedText>
                <View style={styles.chips}>
                  {GIORNI.map((g) => (
                    <Chip
                      key={g}
                      label={g === 1 ? '1 giorno' : `${g} giorni`}
                      active={giorni === g}
                      onPress={() => setGiorni(g)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.gruppo}>
              <ThemedText type="label">PERCHE</ThemedText>
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder={ADMIN.provvedimento.segnaposto}
                placeholderTextColor={c.textSecondary}
                multiline
                style={[styles.campo, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              />
              <ThemedText type="caption" style={{ color: c.textSecondary }}>
                {ADMIN.provvedimento.avvisoMotivazione}
              </ThemedText>
            </View>

            <View style={styles.azioni}>
              <Button label={VOCE.azione.annulla} variant="secondary" onPress={onClose} style={styles.meta} />
              <Button
                label={ADMIN.provvedimento.applica}
                variant="danger"
                loading={loading}
                disabled={motivoCorto}
                onPress={() =>
                  onSubmit({ tipo, giorni: tipo === 'sospensione' ? giorni : undefined, motivo: motivo.trim() })
                }
                style={styles.meta}
              />
            </View>
          </ScrollView>
        </ThemedView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  foglio: { borderTopLeftRadius: Radii.lg, borderTopRightRadius: Radii.lg, maxHeight: '85%' },
  contenuto: { padding: Spacing.md, gap: Spacing.md },
  gruppo: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  campo: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 84,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  azioni: { flexDirection: 'row', gap: Spacing.sm },
  meta: { flex: 1 },
});
