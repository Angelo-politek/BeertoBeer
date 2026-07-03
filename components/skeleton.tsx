import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/use-colors';

type Props = {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  const c = useColors();
  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: radius, backgroundColor: c.skeletonBase },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const c = useColors();
  return (
    <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Skeleton width="45%" height={18} />
      <Skeleton height={14} />
      <Skeleton width="70%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
});
