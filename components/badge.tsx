import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

type Props = {
  label: string;
  /** 'accent' = pillola colorata (es. vibe mode); 'neutral' = grigia */
  tone?: 'accent' | 'neutral';
};

export function Badge({ label, tone = 'neutral' }: Props) {
  const c = useColors();
  const backgroundColor = tone === 'accent' ? c.accent : c.border;
  const color = tone === 'accent' ? c.accentText : c.text;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
