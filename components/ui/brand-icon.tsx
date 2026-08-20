import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

/**
 * Icone del brand: PNG bianchi disegnati a mano (outline 2-3px), tintabili
 * con qualsiasi colore della palette. La mappa è statica perché Metro
 * risolve i require solo a build time.
 */
const ICONS = {
  bottle: require('../../assets/brand/icon-bottle.png'),
  cheers: require('../../assets/brand/icon-cheers.png'),
  cap: require('../../assets/brand/icon-cap.png'),
  pin: require('../../assets/brand/icon-pin.png'),
  heart: require('../../assets/brand/icon-heart.png'),
  star: require('../../assets/brand/icon-star.png'),
  smile: require('../../assets/brand/icon-smile.png'),
  scooter: require('../../assets/brand/icon-scooter.png'),
  bike: require('../../assets/brand/icon-bike.png'),
  cart: require('../../assets/brand/icon-cart.png'),
  home: require('../../assets/brand/icon-home.png'),
  profile: require('../../assets/brand/icon-profile.png'),
  chat: require('../../assets/brand/icon-chat.png'),
  bell: require('../../assets/brand/icon-bell.png'),
  'send-arrow': require('../../assets/brand/icon-send-arrow.png'),
  'arrow-left': require('../../assets/brand/icon-arrow-left.png'),
  'arrow-right': require('../../assets/brand/icon-arrow-right.png'),
  'x-mark': require('../../assets/brand/icon-x-mark.png'),
  check: require('../../assets/brand/icon-check.png'),
  plus: require('../../assets/brand/icon-plus.png'),
  wallet: require('../../assets/brand/icon-wallet.png'),
} as const;

export type BrandIconName = keyof typeof ICONS;

type Props = {
  name: BrandIconName;
  /** lato del quadrato in cui l'icona viene contenuta */
  size?: number;
  /** tinta (le icone sorgente sono bianche); undefined = colore originale */
  color?: string;
  style?: StyleProp<ImageStyle>;
};

export function BrandIcon({ name, size = 24, color, style }: Props) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      tintColor={color}
    />
  );
}
