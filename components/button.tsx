import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Fonts, Radii } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  disabled?: boolean;
};

/**
 * Bottone stile poster: primario giallo pieno con testo nero, secondario
 * outline bianco sporco, danger Brick Red pieno. Etichetta in Bebas Neue
 * maiuscola, molto evidente. Niente ombre né glow.
 */
export function Button({ label, onPress, variant = 'primary', size = 'lg', style, loading, disabled }: Props) {
  const c = useColors();
  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; borderColor?: string }> = {
    primary: { bg: c.accent, fg: c.accentText },
    secondary: { bg: 'transparent', fg: c.text, borderColor: c.text },
    danger: { bg: c.dangerStrong, fg: c.text },
    ghost: { bg: 'transparent', fg: c.accent },
  };
  const { bg, fg, borderColor } = palette[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      pressedScale={0.97}
      // Un bottone è un'azione, non una navigazione: qui la vibrazione
      // significa ancora qualcosa. Sulle righe e sulle card è spenta.
      haptic
      style={[
        styles.button,
        size === 'md' ? styles.md : styles.lg,
        { backgroundColor: bg },
        borderColor ? { borderWidth: 1.5, borderColor } : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, size === 'md' ? styles.labelMd : null, { color: fg }]}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lg: { height: 54 },
  md: { height: 42, paddingHorizontal: 16 },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: Fonts.display,
    fontSize: 21,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  labelMd: { fontSize: 18 },
});
