import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Springs } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';

/** Icona per ogni route delle tab (nomi SF Symbols, mappati su Material in Android). */
const TAB_ICONS: Record<string, React.ComponentProps<typeof IconSymbol>['name']> = {
  index: 'house.fill',
  community: 'person.2.fill',
  wallet: 'creditcard.fill',
  profile: 'person.fill',
};

/**
 * Tab bar custom: superficie elevata con angoli superiori arrotondati, pillola
 * ambrata che sboccia dietro l'icona attiva e micro-rimbalzo dell'icona.
 */
export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors();
  const sh = useShadows();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: c.border,
        },
        sh.raised,
      ]}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === i;

        return (
          <TabItem
            key={route.key}
            label={label}
            icon={TAB_ICONS[route.name] ?? 'house.fill'}
            focused={focused}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
              }
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  focused: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, Springs.bouncy);
  }, [focused, active]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: interpolate(active.value, [0, 1], [0.5, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(active.value, [0, 1], [1, 1.08]) },
      { translateY: interpolate(active.value, [0, 1], [0, -1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(active.value, [0, 1], [c.tabIconDefault, c.accentStrong]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityLabel={label}>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.pill, { backgroundColor: c.accentSoft }, pillStyle]} />
        <Animated.View style={iconStyle}>
          <IconSymbol size={24} name={icon} color={focused ? c.accent : c.tabIconDefault} />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconSlot: {
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.pill,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
