import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

const STICKERS: Record<string, number> = {
  'sticker-b2b': require('../assets/brand/sticker-b2b.png'),
  'sticker-bottle': require('../assets/brand/sticker-bottle.png'),
  'sticker-moped': require('../assets/brand/sticker-moped.png'),
  'sticker-vibe': require('../assets/brand/sticker-vibe.png'),
  'open-source': require('../assets/brand/open-source.png'),
  'no-profit': require('../assets/brand/no-profit.png'),
  'icon-pin': require('../assets/brand/icon-pin.png'),
  'icon-cheers': require('../assets/brand/icon-cheers.png'),
  'icon-star': require('../assets/brand/icon-star.png'),
};

export function ProfileStickerImage({ assetKey, size = 72, style }: { assetKey: string; size?: number; style?: StyleProp<ImageStyle> }) {
  const source = STICKERS[assetKey] ?? STICKERS['sticker-b2b'];
  return <Image source={source} contentFit="contain" style={[{ width: size, height: size }, style]} />;
}
