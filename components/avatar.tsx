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
};

export function Avatar({ name, size = 48 }: Props) {
  const c = useColors();

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent },
      ]}>
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
