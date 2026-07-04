import * as Haptics from 'expo-haptics';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Springs } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** quanto si "schiaccia" al tocco (default 0.97) */
  pressedScale?: number;
  /** vibrazione leggera al tocco (default true) */
  haptic?: boolean;
};

/**
 * Il Pressable standard dell'app: si schiaccia con una molla al tocco e dà un
 * feedback aptico leggero. È la base di card, chip, bottoni e righe toccabili —
 * un unico linguaggio di movimento ovunque.
 */
export function PressableScale({
  style,
  pressedScale = 0.97,
  haptic = true,
  onPressIn,
  onPress,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(ev) => {
        scale.value = withSpring(pressedScale, Springs.press);
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        }
        onPressIn?.(ev);
      }}
      onPressOut={(ev) => {
        scale.value = withSpring(1, Springs.press);
        rest.onPressOut?.(ev);
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    />
  );
}
