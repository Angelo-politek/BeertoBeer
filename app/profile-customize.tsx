import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ProfileShowcase } from '@/components/profile-showcase';
import { ProfileStickerImage } from '@/components/profile-sticker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandIcon } from '@/components/ui/brand-icon';
import { Radii, Spacing } from '@/constants/theme';
import { deleteProfilePhoto, getCurrentUser, getProfileCustomization, saveProfileCustomization } from '@/data/api';
import { PERSONE, VOCE } from '@/constants/testi';
import { messaggioServer } from '@/lib/errori';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { pickAndUploadProfilePhoto } from '@/lib/avatar-upload';
import type { ProfileCustomization, ProfilePhotoVisibility, ProfileSticker } from '@/types';

const TASTES=['IPA','Lager','Pils','Stout','Analcolica','Artigianale'];
const TIMES=[...PERSONE.vetrina.fasce];
const EMPTY:ProfileCustomization={userId:'',statusPhrase:'',beerTastes:[],availability:[],photoVisibility:'tutti',photos:[],stickers:[]};

export default function ProfileCustomizeScreen(){
  const c=useColors(); const router=useRouter(); const {session}=useSession();
  const [value,setValue]=useState(EMPTY); const [name,setName]=useState('BeerToBeer'); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState<number|null>(null); const [saving,setSaving]=useState(false);
  useEffect(()=>{Promise.all([getProfileCustomization(),getCurrentUser()]).then(([v,u])=>{setValue(v);setName(u.nome);}).catch(()=>Alert.alert(PERSONE.vetrina.nonDisponibile,PERSONE.vetrina.migrazioneMancante)).finally(()=>setLoading(false));},[]);
  const photoAt=(i:number)=>value.photos.find(p=>p.position===i);
  async function addPhoto(position:number){if(!session?.user.id)return;setBusy(position);try{const photo=await pickAndUploadProfilePhoto(session.user.id,position);if(photo)setValue(v=>({...v,photos:[...v.photos.filter(p=>p.position!==position),photo].sort((a,b)=>a.position-b.position)}));}catch{Alert.alert(PERSONE.vetrina.fotoNonCaricata,PERSONE.vetrina.connessioneKo);}finally{setBusy(null);}}
  async function removePhoto(position:number){const p=photoAt(position);if(!p)return;await deleteProfilePhoto(p.id,p.storagePath);setValue(v=>({...v,photos:v.photos.filter(x=>x.id!==p.id)}));}
  function toggle(list:'beerTastes'|'availability',item:string){setValue(v=>({...v,[list]:v[list].includes(item)?v[list].filter(x=>x!==item):[...v[list],item]}));}
  // NB: ovunque si confronta con "!= null" e non con "!== undefined".
  // Il database restituisce slot = null per gli sticker non in vetrina, e in
  // JavaScript null !== undefined: col confronto stretto passavano il filtro e
  // il salvataggio veniva rifiutato in blocco ("null value in column slot").
  function toggleSticker(key:string){
    const target=value.stickers.find(s=>s.key===key); if(!target)return;
    // Già in vetrina → lo tolgo.
    if(target.slot!=null){setValue(v=>({...v,stickers:v.stickers.map(s=>s.key===key?{...s,slot:undefined}:s)}));return;}
    // Cerco la PRIMA casella libera. Contare quanti sticker sono attivi non basta:
    // togliendone uno in mezzo si riassegnerebbe una casella già occupata, e il
    // database rifiuta l'intero salvataggio (vincolo unique(user_id, slot)).
    const used=new Set(value.stickers.filter(s=>s.slot!=null).map(s=>s.slot));
    const free=[0,1,2].find(n=>!used.has(n));
    if(free===undefined){Alert.alert(PERSONE.vetrina.vetrinaPiena,PERSONE.vetrina.troppiSticker);return;}
    setValue(v=>({...v,stickers:v.stickers.map(s=>s.key===key?{...s,slot:free}:s)}));
  }
  function tune(key:string,kind:'scale'|'rotation',delta:number){setValue(v=>({...v,stickers:v.stickers.map(s=>s.key===key?{...s,[kind]:Math.max(kind==='scale'?.75:-12,Math.min(kind==='scale'?1.25:12,(s[kind]??(kind==='scale'?1:0))+delta))}:s)}));}
  // L'errore vero va mostrato: "Controlla i dati e riprova" non dice a nessuno
  // cosa è andato storto, e finora nascondeva il conflitto fra le caselle.
  async function save(){setSaving(true);try{await saveProfileCustomization(value,value.stickers);router.back();}catch(e){Alert.alert(PERSONE.vetrina.nonSalvataTitolo,messaggioServer(e,PERSONE.vetrina.nonSalvataTesto));setSaving(false);}}
  const preview=useMemo(()=>({...value,stickers:value.stickers.filter(s=>s.slot!=null)}),[value]);
  if(loading)return <ThemedView style={styles.center}><ActivityIndicator color={c.accent}/></ThemedView>;
  return <ThemedView style={styles.container}><Stack.Screen options={{title:PERSONE.vetrina.titolo}}/><ScrollView contentContainerStyle={styles.content}>
    <View><ThemedText type="label">{PERSONE.vetrina.sezioneFoto}</ThemedText><ThemedText type="title">{PERSONE.vetrina.occhiello}</ThemedText><ThemedText style={{color:c.textSecondary}}>{PERSONE.vetrina.foto}</ThemedText></View>
    <View style={styles.photoGrid}>{[0,1,2,3].map(i=>{const p=photoAt(i);return <Pressable key={i} onPress={()=>addPhoto(i)} onLongPress={()=>p&&Alert.alert(PERSONE.vetrina.rimuoverePhotoTitolo,PERSONE.vetrina.rimuoverePhotoTesto,[{text:VOCE.azione.annulla,style:'cancel'},{text:PERSONE.vetrina.rimuovi,style:'destructive',onPress:()=>removePhoto(i)}])} style={[styles.photoSlot,{backgroundColor:c.surface}]}>{p?<Image source={{uri:p.url}} contentFit="cover" style={styles.photo}/>:<><BrandIcon name="plus" color={c.accent}/><ThemedText type="caption">{PERSONE.vetrina.fotoNumero(i+1)}</ThemedText></>}{busy===i?<View style={styles.overlay}><ActivityIndicator color={c.accent}/></View>:null}</Pressable>})}</View>
    <ThemedText type="caption">{PERSONE.vetrina.fotoRimuovi}</ThemedText>
    <TextField label={PERSONE.vetrina.frase} value={value.statusPhrase} onChangeText={t=>setValue(v=>({...v,statusPhrase:t.slice(0,60)}))} placeholder={PERSONE.vetrina.fraseSegnaposto}/><ThemedText type="caption">{value.statusPhrase.length}/60</ThemedText>
    <Choice title={PERSONE.vetrina.sezioneGusti} values={TASTES} selected={value.beerTastes} onPress={x=>toggle('beerTastes',x)}/><Choice title={PERSONE.vetrina.quandoCiSei} values={TIMES} selected={value.availability} onPress={x=>toggle('availability',x)}/>
    <View><ThemedText type="label">{PERSONE.vetrina.sezionePrivacy}</ThemedText><View style={styles.chips}>{([['tutti',PERSONE.vetrina.privacyTutti],['connessioni',PERSONE.vetrina.privacyAmici],['nascoste',PERSONE.vetrina.privacyNascoste]] as [ProfilePhotoVisibility,string][]).map(([k,l])=><Chip key={k} label={l} active={value.photoVisibility===k} onPress={()=>setValue(v=>({...v,photoVisibility:k}))}/>)}</View></View>
    <View><ThemedText type="label">STICKER BRAND</ThemedText><ThemedText type="title">SCEGLINE FINO A TRE</ThemedText></View>
    {value.stickers.map(s=><StickerRow key={s.key} sticker={s} onToggle={()=>toggleSticker(s.key)} onTune={tune}/>) }
    <View><ThemedText type="label">{PERSONE.vetrina.sezioneAnteprima}</ThemedText><ProfileShowcase value={preview}/><Button label={PERSONE.vetrina.condividi} variant="secondary" onPress={()=>Share.share({message:PERSONE.vetrina.condivisione(name,value.statusPhrase||PERSONE.vetrina.fraseDiRiserva,value.beerTastes.length?`Gusti: ${value.beerTastes.join(', ')}`:'')})}/></View>
    <Button label={PERSONE.vetrina.salva} loading={saving} onPress={save}/>
  </ScrollView></ThemedView>;
}
function Choice({title,values,selected,onPress}:{title:string;values:string[];selected:string[];onPress:(x:string)=>void}){return <View><ThemedText type="label">{title}</ThemedText><View style={styles.chips}>{values.map(x=><Chip key={x} label={x} active={selected.includes(x)} onPress={()=>onPress(x)}/>)}</View></View>}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){const c=useColors();return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{checked:active}} style={[styles.chip,{backgroundColor:active?c.accent:c.surfaceAlt}]}><ThemedText type="caption" style={{color:active?c.accentText:c.text}}>{label}</ThemedText></Pressable>}
function StickerRow({sticker,onToggle,onTune}:{sticker:ProfileSticker;onToggle:()=>void;onTune:(key:string,k:'scale'|'rotation',d:number)=>void}){const c=useColors();const active=sticker.slot!=null;return <Card style={[styles.stickerRow,{opacity:sticker.unlocked?1:.55}]}><ProfileStickerImage assetKey={sticker.assetKey} size={54*(sticker.scale??1)} style={{transform:[{rotate:`${sticker.rotation??0}deg`}]}}/><View style={{flex:1}}><ThemedText type="subtitle">{sticker.title}</ThemedText><ThemedText type="caption">{sticker.unlocked?sticker.description:sticker.unlockHint}</ThemedText>{active?<><ThemedText type="caption">{PERSONE.vetrina.dimensione(Math.round((sticker.scale??1)*100),Math.round(sticker.rotation??0))}</ThemedText><View style={styles.tuners}><Chip label={PERSONE.vetrina.piuPiccolo} active={false} onPress={()=>onTune(sticker.key,'scale',-.1)}/><Chip label={PERSONE.vetrina.piuGrande} active={false} onPress={()=>onTune(sticker.key,'scale',.1)}/><Chip label={PERSONE.vetrina.ruotaAvanti} active={false} onPress={()=>onTune(sticker.key,'rotation',6)}/><Chip label={PERSONE.vetrina.ruotaIndietro} active={false} onPress={()=>onTune(sticker.key,'rotation',-6)}/></View></>:null}</View><Pressable disabled={!sticker.unlocked} onPress={onToggle} style={[styles.select,{backgroundColor:active?c.accent:c.surfaceAlt}]}><BrandIcon name={active?'check':'plus'} size={18} color={active?c.accentText:c.text}/></Pressable></Card>}
const styles=StyleSheet.create({container:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:Spacing.md,paddingBottom:Spacing.xxl,gap:Spacing.md},photoGrid:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm},photoSlot:{width:'48%',aspectRatio:4/5,borderRadius:Radii.md,alignItems:'center',justifyContent:'center',gap:Spacing.xs,overflow:'hidden'},photo:{width:'100%',height:'100%'},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.55)',alignItems:'center',justifyContent:'center'},chips:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm,marginTop:Spacing.sm},chip:{minHeight:38,paddingHorizontal:12,justifyContent:'center',borderRadius:Radii.pill},stickerRow:{flexDirection:'row',alignItems:'center',gap:Spacing.sm},select:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},tuners:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.xs,marginTop:Spacing.xs}});
