import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Radii } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  label: string;
  onPress: () => void;
  /** stato selezionato: pillola ambrata piena */
  active?: boolean;
};

/** Chip filtro/selettore: tono-su-tono a riposo, ambra piena quando attiva. */
export function Chip({ label, onPress, active }: Props) {
  const c = useColors();

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.94}
      style={[
        styles.chip,
        { backgroundColor: active ? c.accent : c.surfaceAlt },
      ]}>
      <Text style={[styles.label, { color: active ? c.accentText : c.textSecondary }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
