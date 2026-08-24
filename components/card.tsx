import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { entraInLista } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** se presente la card diventa toccabile (spring + haptic) */
  onPress?: () => void;
  onLongPress?: () => void;
  /** posizione in lista: attiva l'ingresso a cascata (FadeInDown scaglionato) */
  index?: number;
  /** superficie in evidenza (ombra più marcata) */
  raised?: boolean;
  /** disattiva il padding interno di default */
  unpadded?: boolean;
};

/**
 * La superficie standard dell'app: card semplice #171717, senza bordi e
 * senza ombra (brand: "Cards. Border: nessuno. Shadow: quasi assente").
 * Con `onPress` reagisce al tocco con una molla; con `index` entra in scena
 * a cascata dentro le liste.
 */
export function Card({ children, style, onPress, onLongPress, index, raised, unpadded }: Props) {
  const c = useColors();
  const sh = useShadows();

  const surface: StyleProp<ViewStyle> = [
    {
      backgroundColor: c.surface,
      borderRadius: Radii.lg,
      padding: unpadded ? 0 : Spacing.md,
      overflow: 'visible',
    },
    raised ? sh.raised : sh.card,
    style,
  ];

  /**
   * Ingresso: una risalita breve, senza molla, presa da constants/motion.
   *
   * Prima era costruito qui: `.delay(min(index,8) * 55).springify().damping(20)`
   * — fino a 440 ms di cascata e un rimbalzo che superava il punto d'arrivo.
   * È la segnalazione «molleggiante e a rallentatore» del collaudo.
   */
  const entering = index != null ? entraInLista(index) : undefined;

  if (onPress || onLongPress) {
    return (
      <Animated.View entering={entering}>
        <PressableScale onPress={onPress} onLongPress={onLongPress} style={surface}>
          {children}
        </PressableScale>
      </Animated.View>
    );
  }

  if (entering) {
    return <Animated.View entering={entering} style={surface}>{children}</Animated.View>;
  }

  return <View style={surface}>{children}</View>;
}
