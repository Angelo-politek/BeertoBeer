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
import { useFoglioUscita } from '@/lib/foglio-uscita-context';
import { oraBreve } from '@/lib/format';

/**
 * LE QUATTRO VOCI DELLA BARRA, IN ORDINE.
 *
 * Prima erano due strutture parallele — un dizionario di icone e un insieme di
 * nomi — che potevano divergere in silenzio: bastava aggiungere una voce a una
 * sola delle due. Ora sono una lista sola, ed e' anche l'ordine visivo.
 *
 * La terza voce non e' una route: e' un'AZIONE. Apre il foglio per dire che sei
 * fuori, e non naviga da nessuna parte. Registrarla come schermata lascerebbe
 * una rotta fantasma apribile da un deep link, che mostrerebbe il vuoto.
 *
 * «GIRI» e non «Home»: era l'unica parola inglese della navigazione, in
 * un'app che parla italiano stretto.
 */
type Voce =
  | { kind: 'route'; name: string; label: string; icon: BrandIconName }
  | { kind: 'azione'; label: string; icon: BrandIconName };

const VOCI: Voce[] = [
  { kind: 'route', name: 'index', label: 'Giri', icon: 'home' },
  { kind: 'route', name: 'map', label: 'Mappa', icon: 'pin' },
  { kind: 'azione', label: 'Fuori', icon: 'cheers' },
  { kind: 'route', name: 'profile', label: 'Profilo', icon: 'profile' },
];

/**
 * Tab bar custom: barra piatta sul nero con riga di separazione sottile,
 * indicatore giallo netto dietro l'icona attiva.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { apri, mia } = useFoglioUscita();

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
      {VOCI.map((voce) => {
        if (voce.kind === 'azione') {
          // Quando sei gia' fuori, la voce lo dice: e' il promemoria che c'e'
          // una dichiarazione aperta a tuo nome, ed e' anche il modo di
          // rientrare (toccandola si riapre il foglio, in modo «rientra»).
          return (
            <TabItem
              key="azione-fuori"
              label={mia ? oraBreve(mia.finisceAlle) : voce.label}
              icon={voce.icon}
              focused={mia != null}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                }
                apri();
              }}
            />
          );
        }

        const route = state.routes.find((r) => r.name === voce.name);
        if (!route) return null;
        const focused = state.routes[state.index]?.key === route.key;

        return (
          <TabItem
            key={route.key}
            label={voce.label}
            icon={voce.icon}
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
