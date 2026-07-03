import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-colors';

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
};

export function StarRating({ value, onChange, size = 32, readonly }: Props) {
  const c = useColors();

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <Pressable
            key={star}
            disabled={readonly}
            accessibilityRole={readonly ? undefined : 'button'}
            accessibilityLabel={`${star} stelle`}
            onPress={() => onChange?.(star)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText style={{ color: active ? c.star : c.starMuted, fontSize: size, lineHeight: size + 4 }}>
              {active ? '★' : '☆'}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
