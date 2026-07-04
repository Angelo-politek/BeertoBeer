import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Tonalità calde per il fallback a iniziali: stabile per nome. */
const FALLBACK_HUES = ['#D07C0C', '#B0693A', '#8A6D2F', '#0A3D91', '#7A4A8C', '#2E7D46'];

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
      <Text style={[styles.initials, { color: '#FFF7EA', fontSize: size * 0.38 }]}>
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
    fontWeight: '800',
  },
});
