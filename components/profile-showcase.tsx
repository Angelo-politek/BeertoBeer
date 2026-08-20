import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '@/components/card';
import { ProfileStickerImage } from '@/components/profile-sticker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { ProfileCustomization } from '@/types';

export function ProfileShowcase({ value }: { value: ProfileCustomization }) {
  const c = useColors(); const shown = value.stickers.filter((s) => s.unlocked && s.slot !== undefined).sort((a,b) => (a.slot ?? 0)-(b.slot ?? 0));
  if (!value.photos.length && !value.statusPhrase && !shown.length && !value.beerTastes.length && !value.availability.length) return null;
  return <Card style={styles.card}>
    {value.photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>{value.photos.map((p) => <Image key={p.id} source={{ uri: p.url }} contentFit="cover" style={styles.photo} />)}</ScrollView> : null}
    {value.statusPhrase ? <ThemedText type="subtitle">“{value.statusPhrase}”</ThemedText> : null}
    {shown.length ? <View style={[styles.board,{backgroundColor:c.surfaceAlt}]}>{shown.map((s) => <ProfileStickerImage key={s.key} assetKey={s.assetKey} size={76*(s.scale ?? 1)} style={{ transform:[{rotate:`${s.rotation ?? 0}deg`}] }} />)}</View> : null}
    {value.beerTastes.length ? <View><ThemedText type="label">GUSTI</ThemedText><ThemedText>{value.beerTastes.join(' · ')}</ThemedText></View> : null}
    {value.availability.length ? <View><ThemedText type="label">DI SOLITO CI SONO</ThemedText><ThemedText>{value.availability.join(' · ')}</ThemedText></View> : null}
  </Card>;
}
const styles=StyleSheet.create({card:{gap:Spacing.md},photos:{gap:Spacing.sm},photo:{width:146,height:183,borderRadius:8},board:{minHeight:104,flexDirection:'row',alignItems:'center',justifyContent:'space-around',padding:Spacing.sm,borderRadius:8}});
