import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { apreFinestra, velo } from '@/constants/motion';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';
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
  const sh = useShadows();
  const [open, setOpen] = useState(false);
  const selected = CITIES.find((city) => city.key === selectedKey);

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Cambia città"
        pressedScale={0.94}
        style={[styles.chip, { backgroundColor: c.surfaceAlt }]}>
        <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong, fontSize: 14 }}>
          {selected?.label ?? 'Città'}
        </ThemedText>
        <ThemedText style={{ color: c.textSecondary, fontSize: 12 }}>▾</ThemedText>
      </PressableScale>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Animated.View entering={velo} style={[styles.backdrop, { backgroundColor: c.overlay }]}>
          <Pressable style={styles.backdropPress} onPress={() => setOpen(false)}>
            <Animated.View entering={apreFinestra}>
              <Pressable style={[styles.sheet, { backgroundColor: c.surface }, sh.raised]}>
                <ThemedText type="subtitle" style={styles.title}>
                  Scegli la città
                </ThemedText>
                {CITIES.map((city) => {
                  const active = city.key === selectedKey;
                  return (
                    <PressableScale
                      key={city.key}
                      onPress={() => {
                        onSelect(city.key);
                        setOpen(false);
                      }}
                      pressedScale={0.97}
                      style={[styles.row, { backgroundColor: active ? c.accentSoft : 'transparent' }]}>
                      <ThemedText type={active ? 'defaultSemiBold' : 'default'} style={active ? { color: c.accentStrong } : null}>
                        {city.label}
                      </ThemedText>
                      {active ? <ThemedText style={{ color: c.accent }}>✓</ThemedText> : null}
                    </PressableScale>
                  );
                })}
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backdrop: {
    flex: 1,
  },
  backdropPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    minWidth: 300,
    maxWidth: 360,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
});
