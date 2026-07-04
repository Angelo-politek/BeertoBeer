import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Radii } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';

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
 * Bottone standard: il primario è pieno con ombra ambrata, il secondario è
 * una superficie tono-su-tono, il danger è soft (niente rossi urlati finché
 * non serve). Tutti si schiacciano con una molla al tocco.
 */
export function Button({ label, onPress, variant = 'primary', size = 'lg', style, loading, disabled }: Props) {
  const c = useColors();
  const sh = useShadows();
  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; shadow?: object }> = {
    primary: { bg: c.accent, fg: c.accentText, shadow: sh.fab },
    secondary: { bg: c.surfaceAlt, fg: c.text },
    danger: { bg: c.dangerSoft, fg: c.danger },
    ghost: { bg: 'transparent', fg: c.accent },
  };
  const { bg, fg, shadow } = palette[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      pressedScale={0.96}
      style={[
        styles.button,
        size === 'md' ? styles.md : styles.lg,
        { backgroundColor: bg },
        !isDisabled && shadow ? shadow : null,
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
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lg: { height: 54 },
  md: { height: 42, paddingHorizontal: 16 },
  disabled: { opacity: 0.45 },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelMd: { fontSize: 15 },
});
