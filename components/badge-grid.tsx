import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandIcon } from '@/components/ui/brand-icon';
import { BADGES, TOKEN_SHORT } from '@/constants/branding';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { UserBadge } from '@/types';

type Props = {
  /** badge sbloccati dall'utente */
  unlocked: UserBadge[];
  /** se true mostra anche quelli ancora da sbloccare (in grigio). Default: true. */
  showLocked?: boolean;
};

/**
 * Griglia dei badge: sbloccati in ambra piena, da sbloccare in tono spento con
 * il reward come incentivo. Usa il catalogo statico BADGES (mirror del seed SQL)
 * così può mostrare anche i traguardi non ancora raggiunti.
 */
export function BadgeGrid({ unlocked, showLocked = true }: Props) {
  const c = useColors();
  const unlockedKeys = new Set(unlocked.map((b) => b.key));

  const visible = showLocked ? BADGES : BADGES.filter((b) => unlockedKeys.has(b.key));

  if (visible.length === 0) {
    return (
      <ThemedText style={{ color: c.textSecondary }}>
        I badge V1 sono stati ritirati. Ora contano i contributi reali alla città.
      </ThemedText>
    );
  }

  return (
    <>
      {/* I badge NON si scelgono: si sbloccano da soli con quello che fai.
          Senza dirlo, la griglia sembra un elenco da spuntare e si finisce a
          toccarli aspettandosi che succeda qualcosa. Gli sticker della vetrina
          sono un'altra cosa, e quelli sì che si scelgono. */}
      <ThemedText type="caption">
        Si sbloccano da soli con quello che fai: non si scelgono. Per decidere cosa mostrare sul
        profilo usa “Personalizza la vetrina”.
      </ThemedText>
      <View style={styles.grid}>
        {visible.map((b, i) => {
        const has = unlockedKeys.has(b.key);
        return (
          <Animated.View
            key={b.key}
            entering={FadeInDown.delay(Math.min(i, 10) * 40).springify().damping(20).stiffness(180)}
            style={[
              styles.cell,
              has
                ? { backgroundColor: c.accentSoft }
                : { backgroundColor: c.surfaceAlt, opacity: 0.65 },
            ]}>
            <BrandIcon name={has ? 'check' : 'x-mark'} size={28} color={has ? c.accent : c.textSecondary} />
            <ThemedText
              type="defaultSemiBold"
              style={[styles.name, { color: has ? c.accentStrong : c.textSecondary }]}
              numberOfLines={2}>
              {b.nome}
            </ThemedText>
            {b.rewardPt > 0 ? (
              <ThemedText style={[styles.reward, { color: has ? c.positive : c.textSecondary }]}>
                +{b.rewardPt} {TOKEN_SHORT}
              </ThemedText>
            ) : (
              <ThemedText style={[styles.reward, { color: c.textSecondary }]}>—</ThemedText>
            )}
          </Animated.View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  emoji: { fontSize: 32, lineHeight: 40 },
  name: { textAlign: 'center', fontSize: 13, lineHeight: 17 },
  reward: { fontFamily: Fonts.sansBold, fontSize: 12 },
});
