import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useDiscoveryFilters } from '@/lib/discovery-context';
import type { DiscoveryFilters } from '@/types';

/** Â«Per teÂ» era la parola delle piattaforme. Questi tre dicono cosa fanno. */
const ORDINAMENTI: { key: DiscoveryFilters['sort']; label: string }[] = [
  { key: 'scadenza', label: 'Chi finisce prima' },
  { key: 'distanza', label: 'Piu vicini' },
  { key: 'recenti', label: 'Appena arrivati' },
];

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
      {/*
        I tre ordinamenti sono dichiarati e visibili, non nascosti dentro un
        tasto che li fa ruotare: chi guarda l'elenco deve poter sapere perche'
        e' in quell'ordine. Il vecchio tasto ciclava fra tre stati invisibili,
        ed era a sua volta un piccolo algoritmo opaco.
      */}
      {ORDINAMENTI.map((o) => (
        <Chip
          key={o.key}
          label={o.label}
          active={filters.sort === o.key}
          onPress={() => updateFilters({ sort: o.key })}
        />
      ))}
      {activeCount > 0 ? <View style={[styles.count, { backgroundColor: c.accent }]}><ThemedText style={{ color: c.accentText, fontSize: 11 }}>{activeCount}</ThemedText></View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.md }, sort: { minHeight: 38, paddingHorizontal: Spacing.sm, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, count: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' } });
