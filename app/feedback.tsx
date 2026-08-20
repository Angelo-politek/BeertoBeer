import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { submitProductFeedback } from '@/data/api';
import { useToast } from '@/components/toast';

export default function FeedbackScreen(){const router=useRouter();const toast=useToast();const[kind,setKind]=useState<'bug'|'idea'>('bug');const[message,setMessage]=useState('');const[saving,setSaving]=useState(false);async function send(){setSaving(true);try{await submitProductFeedback(kind,message);toast.show('Messaggio inviato. Grazie.');router.back();}catch{toast.show('Invio non riuscito.','error');}finally{setSaving(false)}}return <ThemedView style={styles.container}><Stack.Screen options={{title:'Aiutaci a migliorare'}}/><View style={styles.content}><ThemedText type="title">PARLA CON CHI SVILUPPA</ThemedText><ThemedText>Ogni messaggio arriva direttamente al pannello di amministrazione.</ThemedText><View style={styles.chips}><Chip label="Segnala un bug" active={kind==='bug'} onPress={()=>setKind('bug')}/><Chip label="Proponi un’idea" active={kind==='idea'} onPress={()=>setKind('idea')}/></View><TextField label="Messaggio" value={message} onChangeText={setMessage} multiline placeholder="Spiega cosa è successo o cosa miglioreresti"/><Button label="Invia" onPress={send} loading={saving} disabled={message.trim().length<5}/></View></ThemedView>}
const styles=StyleSheet.create({container:{flex:1},content:{padding:Spacing.md,gap:Spacing.md},chips:{flexDirection:'row',gap:Spacing.sm}});
