import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useColors } from '@/hooks/use-colors';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', style, loading, disabled }: Props) {
  const c = useColors();

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.accent, fg: c.accentText, border: c.accent },
    secondary: { bg: 'transparent', fg: c.text, border: c.border },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger },
  };
  const { bg, fg, border } = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: isDisabled ? 0.5 : pressed ? 0.6 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
