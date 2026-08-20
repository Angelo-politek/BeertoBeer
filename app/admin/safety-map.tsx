import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { BrandIcon } from '@/components/ui/brand-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BEER_TO_BEER_MAP_STYLE } from '@/constants/map-style';
import { Spacing } from '@/constants/theme';
import { adminGetActiveOrders, type AdminActiveOrder } from '@/data/api';
import { useColors } from '@/hooks/use-colors';

export default function SafetyMapScreen(){
  const c=useColors();const router=useRouter();const[items,setItems]=useState<AdminActiveOrder[]>([]);const[selected,setSelected]=useState<string>();
  useEffect(()=>{let live=true;const load=()=>adminGetActiveOrders().then(v=>live&&setItems(v)).catch(()=>null);load();const timer=setInterval(load,10000);return()=>{live=false;clearInterval(timer)}},[]);
  const current=items.find(x=>x.id===selected);
  return <ThemedView style={styles.container}><Stack.Screen options={{title:'Safety map'}}/>
    <Map mapStyle={BEER_TO_BEER_MAP_STYLE as never} style={styles.map}><Camera initialViewState={{center:[12.4964,41.9028],zoom:5}}/>
      {items.map(item=><Marker key={`drop-${item.id}`} lngLat={[item.lng,item.lat]}><Pressable accessibilityLabel={`Consegna di ${item.hostName}`} onPress={()=>setSelected(item.id)} style={[styles.marker,{backgroundColor:c.danger,borderColor:c.text}]}><BrandIcon name="home" size={18} color={c.text}/></Pressable></Marker>)}
      {items.filter(x=>x.driverLat!=null&&x.driverLng!=null).map(item=><Marker key={`driver-${item.id}`} lngLat={[item.driverLng!,item.driverLat!]}><Pressable accessibilityLabel={`Driver ${item.driverName}`} onPress={()=>setSelected(item.id)} style={[styles.marker,{backgroundColor:c.accent,borderColor:c.accentText}]}><BrandIcon name="scooter" size={20} color={c.accentText}/></Pressable></Marker>)}
    </Map>
    <View style={[styles.panel,{backgroundColor:c.surface}]}><ThemedText type="defaultSemiBold">{items.length} giri attivi · aggiornamento 10 s</ThemedText><ThemedText type="caption">Giallo: ultima posizione approssimata del driver. Rosso: zona di consegna. Gli accessi sono registrati.</ThemedText>
      {current?<View style={styles.person}><Avatar name={current.driverName??'Driver'} uri={current.driverPhoto} size={48}/><View style={styles.flex}><ThemedText type="subtitle">{current.driverName??'Driver non assegnato'}</ThemedText><ThemedText type="caption">Account: {current.driverId?.slice(0,8)??'—'} · {current.state}</ThemedText><ThemedText type="caption">{current.lastSeen?`Posizione: ${relative(current.lastSeen)}`:'Posizione non ancora ricevuta'}</ThemedText></View>{current.driverId?<Pressable onPress={()=>router.push({pathname:'/user/[id]',params:{id:current.driverId!}})}><BrandIcon name="profile" color={c.accent}/></Pressable>:null}<Pressable onPress={()=>router.push({pathname:'/request/[id]',params:{id:current.id}})}><BrandIcon name="arrow-right" color={c.text}/></Pressable></View>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>{items.map(x=><Pressable key={x.id} onPress={()=>setSelected(x.id)} style={[styles.pill,{backgroundColor:c.surfaceAlt}]}><ThemedText type="caption">{x.driverName??x.hostName}</ThemedText></Pressable>)}</ScrollView>}
    </View>
  </ThemedView>;
}
function relative(value:string){const sec=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/1000));return sec<60?`${sec}s fa`:`${Math.round(sec/60)} min fa`}
const styles=StyleSheet.create({container:{flex:1},map:{flex:1},marker:{width:42,height:42,borderRadius:21,borderWidth:2,alignItems:'center',justifyContent:'center'},panel:{position:'absolute',left:12,right:12,bottom:18,padding:Spacing.md,borderRadius:10,gap:6},person:{flexDirection:'row',alignItems:'center',gap:Spacing.sm,marginTop:Spacing.sm},flex:{flex:1},list:{gap:Spacing.sm,marginTop:Spacing.xs},pill:{paddingHorizontal:12,paddingVertical:8,borderRadius:20}});
