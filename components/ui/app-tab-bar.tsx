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

import { BrandIcon, type BrandIconName } from '@/components/ui/brand-icon';
import { Fonts, Radii, Springs } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Icona brand (PNG disegnati a mano) per ogni route delle tab. */
const TAB_ICONS: Record<string, BrandIconName> = {
  index: 'home',
  map: 'pin',
  profile: 'profile',
};

/** Le route legacy restano registrate per i vecchi deep link, ma non sono tab. */
const PRIMARY_TABS = new Set(['index', 'map', 'profile']);

/**
 * Tab bar custom: barra piatta sul nero con riga di separazione sottile,
 * indicatore giallo netto dietro l'icona attiva.
 */
export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.background,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: c.border,
        },
      ]}>
      {state.routes.filter((route) => PRIMARY_TABS.has(route.name)).map((route) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.routes[state.index]?.key === route.key;

        return (
          <TabItem
            key={route.key}
            label={label}
            icon={TAB_ICONS[route.name] ?? 'bottle'}
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
  icon: BrandIconName;
  focused: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const reducedMotion = useReducedMotion();
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = reducedMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, Springs.gentle);
  }, [focused, active, reducedMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: interpolate(active.value, [0, 1], [0.5, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(active.value, [0, 1], [1, 1.03]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(active.value, [0, 1], [c.tabIconDefault, c.accent]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} testID={`tab-${label.toLowerCase()}`}>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.pill, { backgroundColor: c.accentSoft }, pillStyle]} />
        <Animated.View style={iconStyle}>
          <BrandIcon size={26} name={icon} color={focused ? c.accent : c.tabIconDefault} />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
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
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
