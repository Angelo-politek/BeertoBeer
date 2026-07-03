import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { CITIES } from '@/lib/cities';

type Props = {
  selectedKey: string;
  onSelect: (key: string) => void;
};

/**
 * Chip con la città corrente che apre un picker modale. La selezione vale per
 * tutta l'app (feed e creazione richieste) e viene ricordata tra i riavvii.
 */
export function CityPicker({ selectedKey, onSelect }: Props) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const selected = CITIES.find((city) => city.key === selectedKey);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Cambia città"
        style={({ pressed }) => [
          styles.chip,
          { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
          📍 {selected?.label ?? 'Città'}
        </ThemedText>
        <ThemedText style={{ color: c.textSecondary }}>▾</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="subtitle" style={styles.title}>
              Scegli la città
            </ThemedText>
            {CITIES.map((city) => {
              const active = city.key === selectedKey;
              return (
                <Pressable
                  key={city.key}
                  onPress={() => {
                    onSelect(city.key);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: active ? c.accentSoft : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <ThemedText type={active ? 'defaultSemiBold' : 'default'}>{city.label}</ThemedText>
                  {active ? <ThemedText style={{ color: c.accent }}>✓</ThemedText> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
});
