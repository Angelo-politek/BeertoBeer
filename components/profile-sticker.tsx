import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

/**
 * Sticker della vetrina.
 *
 * Le chiavi restano quelle salvate nel database (profile_stickers.asset_key):
 * qui si decide solo QUALE file disegnano.
 *
 * `sticker-b2b` e `sticker-moped` puntano a due file di sostituzione: gli
 * originali erano tagliati al bordo inferiore (alla nuvoletta B2B mancava la
 * curva sotto, allo scooter le ruote) e i pixel persi non sono recuperabili.
 * I file originali restano in assets/brand per quando si troverà il disegno
 * completo: basterà rimettere qui il require di prima.
 */
const STICKERS: Record<string, number> = {
  'sticker-b2b': require('../assets/brand/sticker-community.png'),
  'sticker-bottle': require('../assets/brand/sticker-bottle.png'),
  'sticker-moped': require('../assets/brand/sticker-rider.png'),
  'sticker-vibe': require('../assets/brand/sticker-vibe.png'),
  'open-source': require('../assets/brand/open-source.png'),
  'no-profit': require('../assets/brand/no-profit.png'),
  'icon-pin': require('../assets/brand/icon-pin.png'),
  'icon-cheers': require('../assets/brand/icon-cheers.png'),
  'icon-star': require('../assets/brand/icon-star.png'),
};

/**
 * Proporzioni reali (larghezza / altezza) di ogni file, misurate sui PNG.
 *
 * Servono perché prima ogni sticker veniva messo dentro un QUADRATO: con
 * proporzioni che vanno da 0.42 (la bottiglia, stretta e alta) a 1.27, quelli
 * larghi finivano disegnati alti la metà degli altri, con un buco di spazio
 * vuoto sotto. Dando a tutti la stessa ALTEZZA e lasciando che la larghezza
 * segua la forma, stanno sulla stessa linea e pesano allo stesso modo.
 */
const RATIOS: Record<string, number> = {
  'sticker-b2b': 1.24,
  'sticker-bottle': 0.42,
  'sticker-moped': 1.14,
  'sticker-vibe': 1.15,
  'open-source': 1.27,
  'no-profit': 1.26,
  'icon-pin': 0.73,
  'icon-cheers': 1.14,
  'icon-star': 1.0,
};

/** Oltre questa larghezza (in multipli dell'altezza) tre sticker in fila non ci starebbero. */
const MAX_RATIO = 1.4;

export function ProfileStickerImage({
  assetKey,
  size = 72,
  style,
}: {
  assetKey: string;
  /** altezza dello sticker; la larghezza segue la sua forma reale */
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const source = STICKERS[assetKey] ?? STICKERS['sticker-b2b'];
  const ratio = Math.min(RATIOS[assetKey] ?? 1, MAX_RATIO);
  return (
    <Image
      source={source}
      contentFit="contain"
      style={[{ width: size * ratio, height: size }, style]}
    />
  );
}
