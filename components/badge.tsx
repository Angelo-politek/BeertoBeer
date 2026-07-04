import { StyleSheet, Text, View } from 'react-native';

import { Radii } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  label: string;
  /** 'accent' = pillola ambrata (es. vibe mode); 'neutral' = tono su tono; 'danger' | 'positive' */
  tone?: 'accent' | 'neutral' | 'danger' | 'positive';
};

/** Pillola informativa soft: colore di sfondo tenue, testo pieno. */
export function Badge({ label, tone = 'neutral' }: Props) {
  const c = useColors();
  const palette = {
    accent: { bg: c.accentSoft, fg: c.accentStrong },
    neutral: { bg: c.surfaceAlt, fg: c.textSecondary },
    danger: { bg: c.dangerSoft, fg: c.danger },
    positive: { bg: c.positiveSoft, fg: c.positive },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
