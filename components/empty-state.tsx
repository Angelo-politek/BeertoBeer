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

/** Stato vuoto stile sticker: quadrato storto tono-su-tono con emoji + copy diretto. */
export function EmptyState({ title, message, emoji = '🍺' }: Props) {
  const c = useColors();

  return (
    <Animated.View entering={FadeInUp.springify().damping(20).stiffness(160)} style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
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
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    transform: [{ rotate: '-4deg' }],
  },
  emoji: { fontSize: 36, lineHeight: 48 },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
});
