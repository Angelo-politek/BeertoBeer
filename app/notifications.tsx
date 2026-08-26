import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon, type BrandIconName } from '@/components/ui/brand-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Spacing } from '@/constants/theme';
import { getNotifications, markNotificationRead } from '@/data/api';
import { SISTEMA } from '@/constants/testi';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import type { NotificationItem } from '@/types';

export default function NotificationsScreen() {
  const c = useColors(); const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]); const [loading, setLoading] = useState(true);
  // Se il caricamento falliva, l'errore non veniva raccolto da nessuno e la
  // schermata mostrava "Tutto tranquillo": identico a non avere notifiche.
  const [error, setError] = useState(false);
  const load = useCallback(async () => { try { setItems(await getNotifications()); setError(false); } catch { setError(true); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const iconFor = (category: NotificationItem['category']): BrandIconName => category === 'chat' ? 'chat' : category === 'event' ? 'cheers' : category === 'mission' ? 'star' : category === 'safety' ? 'heart' : 'bottle';
  async function open(item: NotificationItem) { if (!item.readAt) { await markNotificationRead(item.id).catch(() => null); setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)); } if (item.url?.startsWith('/')) router.push(item.url as never); }
  return <ThemedView style={styles.container}><Stack.Screen options={{ title: SISTEMA.notifiche.titolo }} /><FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshing={loading} onRefresh={load} renderItem={({ item }) => <PressableScale onPress={() => open(item)} style={[styles.row, { backgroundColor: item.readAt ? c.surface : c.accentSoft }]}><View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><BrandIcon name={iconFor(item.category)} size={22} color={c.accent} /></View><View style={styles.text}><ThemedText type="defaultSemiBold">{item.title}</ThemedText><ThemedText style={{ color: c.textSecondary }}>{item.body}</ThemedText><ThemedText type="caption">{formatShortDate(item.createdAt)}</ThemedText></View>{!item.readAt ? <View style={[styles.dot, { backgroundColor: c.accent }]} /> : null}</PressableScale>} ListEmptyComponent={loading ? null : error ? <EmptyState icon="x-mark" title={SISTEMA.notifiche.nonCaricateTitolo} message={SISTEMA.notifiche.nonCaricateTesto} /> : <EmptyState icon="bell" title={SISTEMA.notifiche.vuotaTitolo} message={SISTEMA.notifiche.vuotaTesto} />} /></ThemedView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, list: { padding: Spacing.md, gap: Spacing.sm }, row: { minHeight: 82, borderRadius: 10, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, icon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, text: { flex: 1, gap: 2 }, dot: { width: 8, height: 8, borderRadius: 4 } });
