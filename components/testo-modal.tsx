import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { velo } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

/**
 * «SCRIVI COSA E' SUCCESSO».
 *
 * Serve dove un pulsante da solo non basta. «Non mi sento al sicuro» premuto e
 * basta dice che c'e' un problema ma non quale: chi deve intervenire non sa se
 * si tratta di un cane che abbaia o di qualcuno che non se ne va dalla porta.
 * Un allarme senza contesto non e' azionabile.
 *
 * Esiste come componente e non come `Alert.prompt` perche' quello funziona
 * solo su iPhone, e la beta parte su Android.
 */

type Props = {
  visible: boolean;
  titolo: string;
  spiegazione: string;
  placeholder: string;
  etichettaConferma: string;
  /** Sotto questa lunghezza il pulsante resta spento. */
  minimo?: number;
  pericolo?: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (testo: string) => void;
};

export function TestoModal({
  visible,
  titolo,
  spiegazione,
  placeholder,
  etichettaConferma,
  minimo = 5,
  pericolo,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const c = useColors();
  const [testo, setTesto] = useState('');

  // Riaprendola per un altro motivo non deve restare dentro il testo di prima.
  useEffect(() => {
    if (visible) setTesto('');
  }, [visible]);

  const troppoCorto = testo.trim().length < minimo;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={velo} style={[styles.velo, { backgroundColor: c.overlay }]}>
        <ThemedView style={[styles.foglio, { backgroundColor: c.surface }]}>
          <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">{titolo}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{spiegazione}</ThemedText>

            <TextInput
              value={testo}
              onChangeText={setTesto}
              placeholder={placeholder}
              placeholderTextColor={c.textSecondary}
              multiline
              autoFocus
              style={[styles.campo, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            />

            <View style={styles.azioni}>
              <Button label="Annulla" variant="secondary" onPress={onClose} style={styles.meta} />
              <Button
                label={etichettaConferma}
                variant={pericolo ? 'danger' : 'primary'}
                loading={loading}
                disabled={troppoCorto}
                onPress={() => onSubmit(testo.trim())}
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
  contenuto: { padding: Spacing.md, gap: Spacing.sm },
  campo: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  azioni: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  meta: { flex: 1 },
});
