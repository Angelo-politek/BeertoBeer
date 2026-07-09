import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';

type Props = {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/** Blocco skeleton con respiro cromatico morbido (base ⇄ highlight). */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  const c = useColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pulse.value, [0, 1], [c.skeletonBase, c.skeletonHighlight]),
  }));

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
}

/** Placeholder a forma di RequestCard, per il feed in caricamento. */
export function SkeletonCard() {
  const c = useColors();
  const sh = useShadows();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface },
        sh.card,
      ]}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={styles.lines}>
          <Skeleton width="55%" height={16} />
          <Skeleton width="35%" height={12} />
        </View>
      </View>
      <Skeleton height={14} />
      <Skeleton width="65%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lines: { flex: 1, gap: 8 },
});
