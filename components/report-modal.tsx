import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { velo } from '@/constants/motion';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { ReportReason } from '@/types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'comportamento_scorretto', label: 'Comportamento scorretto' },
  { value: 'ordine_falso', label: 'Giro falso' },
  { value: 'molestie', label: 'Molestie' },
  { value: 'spam', label: 'Spam' },
  { value: 'sicurezza', label: 'Sicurezza' },
  { value: 'altro', label: 'Altro' },
];

type Props = {
  visible: boolean;
  reason: ReportReason;
  details: string;
  loading?: boolean;
  /** Titolo della modale (default: "Segnala persona"). */
  title?: string;
  onReasonChange: (reason: ReportReason) => void;
  onDetailsChange: (details: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

/**
 * IL FOGLIO DELLA SEGNALAZIONE.
 *
 * COSA NON ANDAVA (segnalazione del collaudo, ed è la peggiore di tutte
 * perché tappa il canale da cui arrivano le altre): «se il messaggio di
 * segnalazione è molto lungo la pagina non permette di scorrere verso il
 * basso per intercettare il pulsante invia».
 *
 * Il perché, esatto: il foglio era centrato (`justifyContent: 'center'`) e non
 * aveva né altezza massima né area scorrevole. Sei chip che vanno a capo su
 * uno schermo stretto, più un campo multilinea, più la tastiera aperta: il
 * foglio cresce oltre lo schermo e — essendo centrato — deborda *simmetrico*,
 * portando la riga dei pulsanti fuori dal bordo inferiore. Irraggiungibile.
 *
 * Il rimedio non è nuovo: è lo stesso schema già in casa in `testo-modal.tsx`
 * e `provvedimento-modal.tsx` — foglio ancorato in basso, tetto all'85% dello
 * schermo, e tutto il contenuto dentro uno ScrollView che non ruba il tocco
 * alla tastiera. Questa era l'unica delle tre modali con un campo di testo a
 * non averlo.
 */
export function ReportModal({
  visible,
  reason,
  details,
  loading,
  title = 'Segnala persona',
  onReasonChange,
  onDetailsChange,
  onClose,
  onSubmit,
}: Props) {
  const c = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={velo} style={[styles.velo, { backgroundColor: c.overlay }]}>
        <ThemedView style={[styles.foglio, { backgroundColor: c.surface }]}>
          <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">{title}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              La legge chi modera, e l’altra persona potrà dare la sua versione. Non le diciamo chi
              l’ha segnalata.
            </ThemedText>

            <View style={styles.reasons}>
              {REASONS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  active={item.value === reason}
                  onPress={() => onReasonChange(item.value)}
                />
              ))}
            </View>

            <TextField
              label="Cosa è successo"
              value={details}
              onChangeText={onDetailsChange}
              placeholder="Racconta i fatti: senza sapere cosa è successo non possono aiutarti"
              multiline
            />

            <View style={styles.actions}>
              <Button label="Lascio stare" variant="secondary" onPress={onClose} disabled={loading} style={styles.action} />
              <Button label="Segnala" variant="danger" onPress={onSubmit} loading={loading} style={styles.action} />
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
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  action: {
    flex: 1,
  },
});
