import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandIcon, type BrandIconName } from '@/components/ui/brand-icon';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  title: string;
  message: string;
  /** icona brand nel riquadro (default: bottle) */
  icon?: BrandIconName;
};

/** Stato vuoto stile sticker: quadrato storto con icona brand + copy diretto. */
export function EmptyState({ title, message, icon }: Props) {
  const c = useColors();
  const name = icon ?? 'bottle';

  return (
    <Animated.View entering={FadeInUp.springify().damping(20).stiffness(160)} style={styles.wrap}>
      <View style={[styles.sticker, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        <BrandIcon name={name} size={44} color={c.accent} />
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
  sticker: {
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    transform: [{ rotate: '-4deg' }],
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
});
