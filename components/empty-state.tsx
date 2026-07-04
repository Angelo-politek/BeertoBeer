import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  title: string;
  message: string;
  /** emoji grande nel cerchio in alto (default 🍺) */
  emoji?: string;
};

/** Stato vuoto caldo e incoraggiante: cerchio tono-su-tono con emoji + copy. */
export function EmptyState({ title, message, emoji = '🍺' }: Props) {
  const c = useColors();

  return (
    <Animated.View entering={FadeInUp.springify().damping(20).stiffness(160)} style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor: c.accentSoft }]}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.message, { color: c.textSecondary }]}>{message}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emoji: { fontSize: 40, lineHeight: 52 },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
});
