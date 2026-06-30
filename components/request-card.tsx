import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { BeerRequest } from '@/types';

type Props = {
  request: BeerRequest;
  onPress: () => void;
};

export function RequestCard({ request, onPress }: Props) {
  const c = useColors();
  const birreLabel = request.birre
    .map((b) => `${b.quantita}× ${b.nome}`)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold">{request.host.nome}</ThemedText>
        <ThemedText style={[styles.distance, { color: c.textSecondary }]}>
          {request.distanzaKm.toFixed(1)} km
        </ThemedText>
      </View>

      <ThemedText style={[styles.beers, { color: c.textSecondary }]}>{birreLabel}</ThemedText>

      <View style={styles.footerRow}>
        <View style={styles.badges}>
          {request.vibeMode && <Badge label="✨ vibe mode" tone="accent" />}
        </View>
        <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
          {request.creditiOfferti} crediti
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 14,
  },
  beers: {
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
