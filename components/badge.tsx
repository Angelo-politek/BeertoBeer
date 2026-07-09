import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  label: string;
  /** 'accent' = sticker giallo pieno (es. vibe mode); 'neutral' = tono su tono; 'danger' | 'positive' */
  tone?: 'accent' | 'neutral' | 'danger' | 'positive';
};

/** Etichetta stile sticker: maiuscola, angoli asciutti, giallo pieno quando accent. */
export function Badge({ label, tone = 'neutral' }: Props) {
  const c = useColors();
  const palette = {
    accent: { bg: c.accent, fg: c.accentText },
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  label: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
