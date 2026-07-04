import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';
import type { ReportReason } from '@/types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'comportamento_scorretto', label: 'Comportamento scorretto' },
  { value: 'ordine_falso', label: 'Ordine falso' },
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
  /** Titolo della modale (default: "Segnala utente"). */
  title?: string;
  onReasonChange: (reason: ReportReason) => void;
  onDetailsChange: (details: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ReportModal({
  visible,
  reason,
  details,
  loading,
  title = 'Segnala utente',
  onReasonChange,
  onDetailsChange,
  onClose,
  onSubmit,
}: Props) {
  const c = useColors();
  const sh = useShadows();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(150)} style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <Animated.View
          entering={ZoomIn.springify().damping(18).stiffness(240)}
          style={[styles.sheet, { backgroundColor: c.background }, sh.raised]}>
          <ThemedText type="subtitle">{title}</ThemedText>
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
            label="Dettagli"
            value={details}
            onChangeText={onDetailsChange}
            placeholder="Aggiungi contesto per la moderazione"
            multiline
          />
          <View style={styles.actions}>
            <Button label="Annulla" variant="secondary" onPress={onClose} disabled={loading} style={styles.action} />
            <Button label="Invia" variant="danger" onPress={onSubmit} loading={loading} style={styles.action} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  sheet: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  action: {
    flex: 1,
  },
});
