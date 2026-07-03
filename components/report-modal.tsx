import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <View style={styles.reasons}>
            {REASONS.map((item) => {
              const active = item.value === reason;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => onReasonChange(item.value)}
                  style={[
                    styles.reason,
                    {
                      borderColor: active ? c.accent : c.border,
                      backgroundColor: active ? c.accentSoft : c.surface,
                    },
                  ]}>
                  <ThemedText type={active ? 'defaultSemiBold' : 'default'}>{item.label}</ThemedText>
                </Pressable>
              );
            })}
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reason: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  action: {
    flex: 1,
  },
});
