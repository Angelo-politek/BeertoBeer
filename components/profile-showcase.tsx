import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '@/components/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProfileStickerImage } from '@/components/profile-sticker';
import { ThemedText } from '@/components/themed-text';
import { PERSONE } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { ProfileCustomization } from '@/types';

export function ProfileShowcase({
  value,
  onApriFoto,
}: {
  value: ProfileCustomization;
  /** Se passata, le foto si aprono a schermo intero: erano visibili ma grandi
   *  come un francobollo, e su un profilo che si guarda per decidere se far
   *  entrare qualcuno in casa e' proprio quello che si vuole guardare bene. */
  onApriFoto?: (indice: number) => void;
}) {
  const c = useColors();
  // slot != null e non !== undefined: il database restituisce null per gli
  // sticker NON messi in vetrina, e col confronto stretto passavano tutti —
  // la vetrina mostrava ogni sticker sbloccato e non cambiava mai.
  const shown = value.stickers.filter((s) => s.unlocked && s.slot != null).sort((a,b) => (a.slot ?? 0)-(b.slot ?? 0));
  if (!value.photos.length && !value.statusPhrase && !shown.length && !value.beerTastes.length && !value.availability.length) return null;
  return <Card style={styles.card}>
    {value.photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>{value.photos.map((p, i) => <PressableScale key={p.id} onPress={() => onApriFoto?.(i)}><Image source={{ uri: p.url }} contentFit="cover" style={styles.photo} /></PressableScale>)}</ScrollView> : null}
    {value.statusPhrase ? <ThemedText type="subtitle">“{value.statusPhrase}”</ThemedText> : null}
    {shown.length ? <View style={[styles.board,{backgroundColor:c.surfaceAlt}]}>{shown.map((s) => <ProfileStickerImage key={s.key} assetKey={s.assetKey} size={76*(s.scale ?? 1)} style={{ transform:[{rotate:`${s.rotation ?? 0}deg`}] }} />)}</View> : null}
    {value.beerTastes.length ? <View><ThemedText type="label">{PERSONE.vetrina.sezioneGusti}</ThemedText><ThemedText>{value.beerTastes.join(' · ')}</ThemedText></View> : null}
    {value.availability.length ? <View><ThemedText type="label">{PERSONE.vetrina.diSolitoCiSono}</ThemedText><ThemedText>{value.availability.join(' · ')}</ThemedText></View> : null}
  </Card>;
}
const styles=StyleSheet.create({card:{gap:Spacing.md},photos:{gap:Spacing.sm},photo:{width:146,height:183,borderRadius:8},// flexWrap: con tre sticker larghi e ingranditi al massimo la riga sfonderebbe
// il bordo della card su un telefono stretto, e verrebbero tagliati.
board:{minHeight:104,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-around',gap:Spacing.sm,padding:Spacing.sm,borderRadius:8}});
