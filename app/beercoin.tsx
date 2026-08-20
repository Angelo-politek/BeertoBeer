import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon } from '@/components/ui/brand-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Fonts, Spacing } from '@/constants/theme';
import { getCurrentUser, getTransactions } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/format';
import type { CreditTransaction } from '@/types';

export default function BeerCoinScreen() {
  const c = useColors(); const [balance, setBalance] = useState(0); const [items, setItems] = useState<CreditTransaction[]>([]); const [filter, setFilter] = useState<'all'|'in'|'out'>('all');
  const load = useCallback(async () => { const [user, tx] = await Promise.all([getCurrentUser(), getTransactions()]); setBalance(user.creditiSaldo); setItems(tx); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const visible = items.filter((item) => filter === 'all' || (filter === 'in' ? item.tipo === 'entrata' : item.tipo === 'uscita'));
  return <ThemedView style={styles.container}><Stack.Screen options={{ title: 'BeerCoin' }} /><FlatList data={visible} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListHeaderComponent={<View style={styles.header}><Card style={[styles.balance, { backgroundColor: c.accent }]}><ThemedText type="label" style={{ color: c.accentText }}>SALDO</ThemedText><ThemedText style={[styles.value, { color: c.accentText }]}>{balance}</ThemedText><ThemedText style={{ color: c.accentText }}>Non acquistabili, non trasferibili, non convertibili.</ThemedText></Card><View style={styles.filters}><Filter label="Tutti" active={filter==='all'} onPress={()=>setFilter('all')} /><Filter label="Entrate" active={filter==='in'} onPress={()=>setFilter('in')} /><Filter label="Uscite" active={filter==='out'} onPress={()=>setFilter('out')} /></View></View>} renderItem={({item})=><Card style={styles.row}><BrandIcon name={item.tipo==='entrata'?'plus':'arrow-right'} size={20} color={item.tipo==='entrata'?c.positive:c.textSecondary}/><View style={styles.flex}><ThemedText type="defaultSemiBold">{item.descrizione}</ThemedText><ThemedText type="caption">{formatShortDate(item.data)}</ThemedText></View><ThemedText type="subtitle">{item.tipo==='entrata'?'+':'−'}{item.importo}</ThemedText></Card>} ListEmptyComponent={<EmptyState icon="wallet" title="Nessun movimento" message="I movimenti BeerCoin compariranno qui." />} /></ThemedView>;
}
function Filter({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){const c=useColors();return <PressableScale onPress={onPress} style={[styles.filter,{backgroundColor:active?c.accent:c.surface}]}><ThemedText style={{color:active?c.accentText:c.text}}>{label}</ThemedText></PressableScale>}
const styles=StyleSheet.create({container:{flex:1},list:{padding:Spacing.md,gap:Spacing.sm},header:{gap:Spacing.md},balance:{minHeight:150},value:{fontFamily:Fonts.display,fontSize:64,lineHeight:70},filters:{flexDirection:'row',gap:Spacing.sm},filter:{minHeight:42,paddingHorizontal:Spacing.md,borderRadius:8,alignItems:'center',justifyContent:'center'},row:{flexDirection:'row',alignItems:'center',gap:Spacing.md},flex:{flex:1}});
