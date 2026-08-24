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
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { pickAndUploadProfilePhoto } from '@/lib/avatar-upload';
import type { ProfileCustomization, ProfilePhotoVisibility, ProfileSticker } from '@/types';

const TASTES=['IPA','Lager','Pils','Stout','Analcolica','Artigianale'];
const TIMES=['Dopo lavoro','Sera','Weekend','Giro lampo'];
const EMPTY:ProfileCustomization={userId:'',statusPhrase:'',beerTastes:[],availability:[],photoVisibility:'tutti',photos:[],stickers:[]};

export default function ProfileCustomizeScreen(){
  const c=useColors(); const router=useRouter(); const {session}=useSession();
  const [value,setValue]=useState(EMPTY); const [name,setName]=useState('BeerToBeer'); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState<number|null>(null); const [saving,setSaving]=useState(false);
  useEffect(()=>{Promise.all([getProfileCustomization(),getCurrentUser()]).then(([v,u])=>{setValue(v);setName(u.nome);}).catch(()=>Alert.alert('Profilo non disponibile','Aggiorna prima il database con la migrazione del profilo.')).finally(()=>setLoading(false));},[]);
  const photoAt=(i:number)=>value.photos.find(p=>p.position===i);
  async function addPhoto(position:number){if(!session?.user.id)return;setBusy(position);try{const photo=await pickAndUploadProfilePhoto(session.user.id,position);if(photo)setValue(v=>({...v,photos:[...v.photos.filter(p=>p.position!==position),photo].sort((a,b)=>a.position-b.position)}));}catch{Alert.alert('Foto non caricata','Controlla la connessione e riprova.');}finally{setBusy(null);}}
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
    if(free===undefined){Alert.alert('Vetrina piena','Puoi tenere al massimo tre sticker. Togline uno per farne entrare un altro.');return;}
    setValue(v=>({...v,stickers:v.stickers.map(s=>s.key===key?{...s,slot:free}:s)}));
  }
  function tune(key:string,kind:'scale'|'rotation',delta:number){setValue(v=>({...v,stickers:v.stickers.map(s=>s.key===key?{...s,[kind]:Math.max(kind==='scale'?.75:-12,Math.min(kind==='scale'?1.25:12,(s[kind]??(kind==='scale'?1:0))+delta))}:s)}));}
  // L'errore vero va mostrato: "Controlla i dati e riprova" non dice a nessuno
  // cosa è andato storto, e finora nascondeva il conflitto fra le caselle.
  async function save(){setSaving(true);try{await saveProfileCustomization(value,value.stickers);router.back();}catch(e){Alert.alert('Salvataggio non riuscito',(e as {message?:string})?.message??'Riprova tra un momento.');setSaving(false);}}
  const preview=useMemo(()=>({...value,stickers:value.stickers.filter(s=>s.slot!=null)}),[value]);
  if(loading)return <ThemedView style={styles.center}><ActivityIndicator color={c.accent}/></ThemedView>;
  return <ThemedView style={styles.container}><Stack.Screen options={{title:'La tua vetrina'}}/><ScrollView contentContainerStyle={styles.content}>
    <View><ThemedText type="label">FOTO</ThemedText><ThemedText type="title">IL TUO PROFILO, SENZA ESAGERARE</ThemedText><ThemedText style={{color:c.textSecondary}}>Fino a quattro foto. La prima diventa anche la foto principale.</ThemedText></View>
    <View style={styles.photoGrid}>{[0,1,2,3].map(i=>{const p=photoAt(i);return <Pressable key={i} onPress={()=>addPhoto(i)} onLongPress={()=>p&&Alert.alert('Rimuovere la foto?','La foto verrà eliminata.',[{text:'Annulla'},{text:'Rimuovi',style:'destructive',onPress:()=>removePhoto(i)}])} style={[styles.photoSlot,{backgroundColor:c.surface}]}>{p?<Image source={{uri:p.url}} contentFit="cover" style={styles.photo}/>:<><BrandIcon name="plus" color={c.accent}/><ThemedText type="caption">FOTO {i+1}</ThemedText></>}{busy===i?<View style={styles.overlay}><ActivityIndicator color={c.accent}/></View>:null}</Pressable>})}</View>
    <ThemedText type="caption">Tieni premuta una foto per rimuoverla.</ThemedText>
    <TextField label="Frase del profilo" value={value.statusPhrase} onChangeText={t=>setValue(v=>({...v,statusPhrase:t.slice(0,60)}))} placeholder="Es. Una birra e due chiacchiere"/><ThemedText type="caption">{value.statusPhrase.length}/60</ThemedText>
    <Choice title="GUSTI" values={TASTES} selected={value.beerTastes} onPress={x=>toggle('beerTastes',x)}/><Choice title="QUANDO CI SEI" values={TIMES} selected={value.availability} onPress={x=>toggle('availability',x)}/>
    <View><ThemedText type="label">PRIVACY FOTO</ThemedText><View style={styles.chips}>{([['tutti','Tutti'],['connessioni','Solo connessioni'],['nascoste','Nascoste']] as [ProfilePhotoVisibility,string][]).map(([k,l])=><Chip key={k} label={l} active={value.photoVisibility===k} onPress={()=>setValue(v=>({...v,photoVisibility:k}))}/>)}</View></View>
    <View><ThemedText type="label">STICKER BRAND</ThemedText><ThemedText type="title">SCEGLINE FINO A TRE</ThemedText></View>
    {value.stickers.map(s=><StickerRow key={s.key} sticker={s} onToggle={()=>toggleSticker(s.key)} onTune={tune}/>) }
    <View><ThemedText type="label">ANTEPRIMA POSTER</ThemedText><ProfileShowcase value={preview}/><Button label="Condividi il mio profilo" variant="secondary" onPress={()=>Share.share({message:`${name} su BeerToBeer\n${value.statusPhrase || 'Una community, una città, un giro alla volta.'}\n${value.beerTastes.length?`Gusti: ${value.beerTastes.join(', ')}`:''}`})}/></View>
    <Button label="Salva vetrina" loading={saving} onPress={save}/>
  </ScrollView></ThemedView>;
}
function Choice({title,values,selected,onPress}:{title:string;values:string[];selected:string[];onPress:(x:string)=>void}){return <View><ThemedText type="label">{title}</ThemedText><View style={styles.chips}>{values.map(x=><Chip key={x} label={x} active={selected.includes(x)} onPress={()=>onPress(x)}/>)}</View></View>}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){const c=useColors();return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{checked:active}} style={[styles.chip,{backgroundColor:active?c.accent:c.surfaceAlt}]}><ThemedText type="caption" style={{color:active?c.accentText:c.text}}>{label}</ThemedText></Pressable>}
function StickerRow({sticker,onToggle,onTune}:{sticker:ProfileSticker;onToggle:()=>void;onTune:(key:string,k:'scale'|'rotation',d:number)=>void}){const c=useColors();const active=sticker.slot!=null;return <Card style={[styles.stickerRow,{opacity:sticker.unlocked?1:.55}]}><ProfileStickerImage assetKey={sticker.assetKey} size={54*(sticker.scale??1)} style={{transform:[{rotate:`${sticker.rotation??0}deg`}]}}/><View style={{flex:1}}><ThemedText type="subtitle">{sticker.title}</ThemedText><ThemedText type="caption">{sticker.unlocked?sticker.description:sticker.unlockHint}</ThemedText>{active?<><ThemedText type="caption">{`Dimensione ${Math.round((sticker.scale??1)*100)}% · rotazione ${Math.round(sticker.rotation??0)}°`}</ThemedText><View style={styles.tuners}><Chip label="Più piccolo" active={false} onPress={()=>onTune(sticker.key,'scale',-.1)}/><Chip label="Più grande" active={false} onPress={()=>onTune(sticker.key,'scale',.1)}/><Chip label="Ruota ↻" active={false} onPress={()=>onTune(sticker.key,'rotation',6)}/><Chip label="Ruota ↺" active={false} onPress={()=>onTune(sticker.key,'rotation',-6)}/></View></>:null}</View><Pressable disabled={!sticker.unlocked} onPress={onToggle} style={[styles.select,{backgroundColor:active?c.accent:c.surfaceAlt}]}><BrandIcon name={active?'check':'plus'} size={18} color={active?c.accentText:c.text}/></Pressable></Card>}
const styles=StyleSheet.create({container:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:Spacing.md,paddingBottom:Spacing.xxl,gap:Spacing.md},photoGrid:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm},photoSlot:{width:'48%',aspectRatio:4/5,borderRadius:Radii.md,alignItems:'center',justifyContent:'center',gap:Spacing.xs,overflow:'hidden'},photo:{width:'100%',height:'100%'},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.55)',alignItems:'center',justifyContent:'center'},chips:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm,marginTop:Spacing.sm},chip:{minHeight:38,paddingHorizontal:12,justifyContent:'center',borderRadius:Radii.pill},stickerRow:{flexDirection:'row',alignItems:'center',gap:Spacing.sm},select:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},tuners:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.xs,marginTop:Spacing.xs}});
