import { StyleSheet, Text, View } from 'react-native';

import { LEVELS } from '@/constants/branding';
import { Fonts } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Props = {
  /** livello 0-4 (indice in LEVELS) */
  level: number;
  /** dimensione: 'sm' inline (chat/liste), 'md' su profilo */
  size?: 'sm' | 'md';
};

/** Chip con emoji + titolo del livello Peroni. Status sociale visibile ovunque. */
export function LevelBadge({ level, size = 'sm' }: Props) {
  const c = useColors();
  const def = LEVELS[Math.max(0, Math.min(level, LEVELS.length - 1))];
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: c.accentSoft },
        small ? styles.chipSm : styles.chipMd,
      ]}>
      <Text style={small ? styles.emojiSm : styles.emojiMd}>{def.emoji}</Text>
      <Text style={[styles.label, { color: c.accentStrong }, small ? styles.labelSm : styles.labelMd]}>
        {def.titolo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    gap: 4,
  },
  chipSm: { paddingHorizontal: 9, paddingVertical: 3 },
  chipMd: { paddingHorizontal: 12, paddingVertical: 5 },
  emojiSm: { fontSize: 12 },
  emojiMd: { fontSize: 16 },
  label: { fontFamily: Fonts.sansBold },
  labelSm: { fontSize: 12 },
  labelMd: { fontSize: 14 },
});
