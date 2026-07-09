import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Tonalità brand (mattone, bottiglia, senape, cemento) per il fallback a iniziali: stabile per nome. */
const FALLBACK_HUES = ['#B53A2D', '#234229', '#8A6D2F', '#4A4A44', '#6B4A2E', '#37503C'];

function hueForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_HUES[h % FALLBACK_HUES.length];
}

type Props = {
  name: string;
  size?: number;
  /** URL della foto profilo: se presente mostra la foto, altrimenti le iniziali. */
  uri?: string | null;
  /** anello ambrato attorno alla foto (per gli hero, es. profilo) */
  ring?: boolean;
};

export function Avatar({ name, size = 48, uri, ring }: Props) {
  const c = useColors();
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={[styles.circle, dimensions, { backgroundColor: c.surfaceAlt }]}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View style={[styles.circle, dimensions, { backgroundColor: hueForName(name) }]}>
      <Text style={[styles.initials, { color: '#F4F1EA', fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );

  if (!ring) return inner;

  const pad = Math.max(3, size * 0.045);
  return (
    <View
      style={{
        padding: pad,
        borderRadius: (size + pad * 2 + 4) / 2,
        borderWidth: 2,
        borderColor: c.accent,
        backgroundColor: c.background,
      }}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.sansBlack,
  },
});
