import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Fonts, Radii } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  label: string;
  onPress: () => void;
  /** stato selezionato: giallo pieno con testo nero */
  active?: boolean;
};

/** Chip filtro/selettore: outline grigio a riposo, Beer Yellow pieno quando attiva. */
export function Chip({ label, onPress, active }: Props) {
  const c = useColors();

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.94}
      style={[
        styles.chip,
        active
          ? { backgroundColor: c.accent, borderColor: c.accent }
          : { backgroundColor: 'transparent', borderColor: c.border },
      ]}>
      <Text style={[styles.label, { color: active ? c.accentText : c.textSecondary }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
