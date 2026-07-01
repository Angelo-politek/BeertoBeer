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

type Props = {
  name: string;
  size?: number;
  /** URL della foto profilo: se presente mostra la foto, altrimenti le iniziali. */
  uri?: string | null;
};

export function Avatar({ name, size = 48, uri }: Props) {
  const c = useColors();
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.circle, dimensions, { backgroundColor: c.surface }]}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View style={[styles.circle, dimensions, { backgroundColor: c.accent }]}>
      <Text style={[styles.initials, { color: c.accentText, fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
