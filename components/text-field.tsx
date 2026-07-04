import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  onBlur?: () => void;
  /** messaggio di errore sotto il campo (bordo rosso quando presente) */
  error?: string | null;
};

/**
 * Campo di testo con focus animato: a riposo è una superficie tono-su-tono
 * senza bordo visibile, al focus si accende l'anello ambrato.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  autoCapitalize,
  onBlur,
  error,
}: Props) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const restColor = error ? c.danger : c.border;
  const focusColor = error ? c.danger : c.accent;
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [restColor, focusColor]),
  }));

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: focused ? c.accentStrong : c.textSecondary }]}>{label}</Text>
      <Animated.View
        style={[
          styles.inputWrap,
          { backgroundColor: c.surface },
          ringStyle,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textSecondary + '99'}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={!secureTextEntry}
          onFocus={() => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 150 });
          }}
          onBlur={() => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 150 });
            onBlur?.();
          }}
          style={[
            styles.input,
            {
              color: c.text,
              minHeight: multiline ? 96 : 50,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
      </Animated.View>
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    marginLeft: 4,
  },
});
