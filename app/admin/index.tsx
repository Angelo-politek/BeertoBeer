import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon, type BrandIconName } from '@/components/ui/brand-icon';
import { Spacing } from '@/constants/theme';
import { adminDashboardStats, type AdminStats } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { getCity } from '@/lib/cities';

/**
 * Dashboard amministrazione: fotografia completa dell'ecosistema (utenti,
 * crediti per città, flusso scambi, moderazione) + accesso alle sezioni.
 */
export default function AdminDashboardScreen() {
  const c = useColors();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setStats(await adminDashboardStats());
      setError(null);
    } catch {
      setError('Dashboard non disponibile o permessi insufficienti.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Amministrazione' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error || !stats) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Amministrazione' }} />
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger }}>{error ?? 'Dati non disponibili.'}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const cityRows = Object.keys({ ...stats.utentiPerCitta, ...stats.creditiPerCitta }).sort();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Amministrazione' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}>
        {/* Sezioni operative (con contatori di cosa richiede attenzione) */}
        <View style={styles.grid}>
          <NavCard
            icon="bell"
            label="Segnalazioni"
            badge={stats.segnalazioniAperte}
            onPress={() => router.push('/admin/reports' as never)}
          />
          <NavCard
            icon="profile"
            label="Utenti"
            badge={stats.utentiSospesi > 0 ? stats.utentiSospesi : undefined}
            onPress={() => router.push('/admin/users' as never)}
          />
          <NavCard
            icon="cart"
            label="Negozi"
            badge={stats.negoziInAttesa}
            onPress={() => router.push('/admin/shops' as never)}
          />
        </View>
        <View style={styles.grid}>
          <NavCard
            icon="bottle"
            label="Giri"
            badge={stats.ordiniInCorso}
            onPress={() => router.push('/admin/giri' as never)}
          />
          <NavCard icon="chat" label="Feedback" onPress={() => router.push('/admin/feedback' as never)} />
          <NavCard icon="pin" label="Safety map" onPress={() => router.push('/admin/safety-map' as never)} />
          {/* I numeri singoli qui sotto dicono come stanno le cose ADESSO;
              le statistiche dicono se stanno migliorando o peggiorando. */}
          <NavCard icon="star" label="Statistiche" onPress={() => router.push('/admin/statistiche' as never)} />
        </View>

        {/* Ecosistema */}
        <SectionCard title="Ecosistema">
          <StatRow label="Utenti registrati" value={`${stats.utentiTotali}`} />
          <StatRow label="Utenti sospesi" value={`${stats.utentiSospesi}`} danger={stats.utentiSospesi > 0} />
          <StatRow label="Richieste aperte ora" value={`${stats.richiesteAperte}`} />
          <StatRow label="Consegne in corso" value={`${stats.ordiniInCorso}`} />
          <StatRow label="Scambi completati (totale)" value={`${stats.scambiCompletati}`} />
          <StatRow label="Richieste oscurate" value={`${stats.richiesteOscurate}`} danger={stats.richiesteOscurate > 0} />
          <StatRow label="Negozi approvati" value={`${stats.negoziApprovati}`} />
        </SectionCard>

        {/* Crediti */}
        <SectionCard title="Crediti">
          <StatRow label="Crediti totali in circolazione" value={`${stats.creditiTotali}`} accent />
          <StatRow label="Crediti scambiati (ultimi 7 giorni)" value={`${stats.creditiScambiati7g}`} />
        </SectionCard>

        {/* Per città */}
        <SectionCard title="Per città">
          {cityRows.length === 0 ? (
            <ThemedText style={{ color: c.textSecondary }}>Nessun dato per città.</ThemedText>
          ) : (
            cityRows.map((key) => (
              <StatRow
                key={key}
                label={key === 'sconosciuta' ? 'Senza città' : getCity(key).label}
                value={`${stats.utentiPerCitta[key] ?? 0} utenti · ${stats.creditiPerCitta[key] ?? 0} crediti`}
              />
            ))
          )}
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

function NavCard({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: BrandIconName;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navCard,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <BrandIcon name={icon} size={26} color={c.accent} />
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {badge != null && badge > 0 ? (
        <View style={[styles.navBadge, { backgroundColor: c.danger }]}>
          <ThemedText style={styles.navBadgeText}>{badge}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      {children}
    </View>
  );
}

function StatRow({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.statRow}>
      <ThemedText style={{ color: c.textSecondary, flex: 1 }}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={{ color: accent ? c.accent : danger ? c.danger : c.text }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.md },
  grid: { flexDirection: 'row', gap: Spacing.sm },
  navCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.md,
  },
  navIcon: { fontSize: 26, lineHeight: 32 },
  navBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgeText: { color: '#F4F1EA', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  section: { borderWidth: 1, borderRadius: 12, padding: Spacing.md, gap: Spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
