import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { BrandIcon } from '@/components/ui/brand-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useDiscoveryFilters } from '@/lib/discovery-context';

export function DiscoveryFilterBar() {
  const c = useColors();
  const { filters, activeCount, updateFilters, resetFilters } = useDiscoveryFilters();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Chip label="Tutti" active={activeCount === 0} onPress={resetFilters} />
      <Chip label="Adesso" active={filters.time === 'now'} onPress={() => updateFilters({ time: filters.time === 'now' ? 'all' : 'now' })} />
      <Chip label="Stasera" active={filters.time === 'tonight'} onPress={() => updateFilters({ time: filters.time === 'tonight' ? 'all' : 'tonight' })} />
      <Chip label="Vibe mode" active={filters.vibeOnly} onPress={() => updateFilters({ vibeOnly: !filters.vibeOnly })} />
      <Chip label="Entro 3 km" active={filters.maxDistanceKm === 3} onPress={() => updateFilters({ maxDistanceKm: filters.maxDistanceKm === 3 ? null : 3 })} />
      <PressableScale accessibilityRole="button" accessibilityLabel="Cambia ordinamento" onPress={() => updateFilters({ sort: filters.sort === 'smart' ? 'distance' : filters.sort === 'distance' ? 'recent' : 'smart' })} style={[styles.sort, { borderColor: c.border }]}>
        <BrandIcon name="arrow-right" size={15} color={c.accent} />
        <ThemedText type="caption">{filters.sort === 'smart' ? 'Per te' : filters.sort === 'distance' ? 'Distanza' : 'Recenti'}</ThemedText>
      </PressableScale>
      {activeCount > 0 ? <View style={[styles.count, { backgroundColor: c.accent }]}><ThemedText style={{ color: c.accentText, fontSize: 11 }}>{activeCount}</ThemedText></View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.md }, sort: { minHeight: 38, paddingHorizontal: Spacing.sm, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, count: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' } });
