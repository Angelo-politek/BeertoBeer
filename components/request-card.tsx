import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { whyThisRequest } from '@/lib/discovery';
import type { BeerRequest } from '@/types';

type Props = {
  request: BeerRequest;
  onPress: () => void;
  /** posizione in lista per l'ingresso a cascata */
  index?: number;
};

/**
 * Card di una richiesta nel feed: chi chiede (avatar + livello), cosa chiede,
 * quanto dista e quanto offre. Il compenso è il protagonista in basso a destra.
 */
export function RequestCard({ request, onPress, index }: Props) {
  const c = useColors();
  const birreLabel = request.birre.map((b) => `${b.quantita} × ${b.nome}`).join(' · ');
  const rightHint = request.distanzaKm != null ? `${request.distanzaKm.toFixed(1)} km` : request.fascia ?? null;

  return (
    <Card onPress={onPress} index={index}>
      <View style={styles.headerRow}>
        <Avatar name={request.host.nome} uri={request.host.fotoUrl} size={44} />
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {request.host.nome}
          </ThemedText>
          <ThemedText type="caption">{request.host.ratingMedio.toFixed(1)} su 5 · {request.host.scambiCompletati} giri</ThemedText>
        </View>
        {rightHint ? (
          <ThemedText type="caption" style={{ color: c.textSecondary }}>
            {rightHint}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText style={[styles.beers, { color: c.textSecondary }]} numberOfLines={2}>
        {birreLabel}
      </ThemedText>
      {whyThisRequest(request) ? (
        <ThemedText type="caption" style={{ color: c.accent }}>{whyThisRequest(request)}</ThemedText>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.badges}>
          {request.vibeMode && <Badge label="Vibe mode" tone="accent" />}
        </View>
        <View style={[styles.reward, { backgroundColor: c.accentSoft }]}>
          <ThemedText type="defaultSemiBold" style={{ color: c.accentStrong, fontSize: 15 }}>
            {request.creditiOfferti} BeerCoin
          </ThemedText>
        </View>
      </View>
      <View style={[styles.openAction, { borderTopColor: c.border }]}>
        <ThemedText type="defaultSemiBold">Vedi giro</ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  headerText: {
    flex: 1,
    gap: 3,
    alignItems: 'flex-start',
  },
  beers: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: Spacing.sm + 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm + 4,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  reward: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  openAction: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, alignItems: 'flex-end' },
});
