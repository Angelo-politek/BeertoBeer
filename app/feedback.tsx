import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { SISTEMA } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { submitProductFeedback } from '@/data/api';
import { useToast } from '@/components/toast';

export default function FeedbackScreen(){const router=useRouter();const toast=useToast();const[kind,setKind]=useState<'bug'|'idea'>('bug');const[message,setMessage]=useState('');const[saving,setSaving]=useState(false);async function send(){setSaving(true);try{await submitProductFeedback(kind,message);toast.show(SISTEMA.feedback.inviato);router.back();}catch{toast.show(SISTEMA.feedback.nonInviato,'error');}finally{setSaving(false)}}return <ThemedView style={styles.container}><Stack.Screen options={{title:SISTEMA.feedback.titolo}}/><View style={styles.content}><ThemedText type="title">{SISTEMA.feedback.occhiello}</ThemedText><ThemedText>{SISTEMA.feedback.dove}</ThemedText><View style={styles.chips}><Chip label={SISTEMA.feedback.difetto} active={kind==='bug'} onPress={()=>setKind('bug')}/><Chip label={SISTEMA.feedback.idea} active={kind==='idea'} onPress={()=>setKind('idea')}/></View><TextField label={SISTEMA.feedback.campo} value={message} onChangeText={setMessage} multiline placeholder={SISTEMA.feedback.segnaposto}/><Button label={SISTEMA.feedback.invia} onPress={send} loading={saving} disabled={message.trim().length<5}/></View></ThemedView>}
const styles=StyleSheet.create({container:{flex:1},content:{padding:Spacing.md,gap:Spacing.md},chips:{flexDirection:'row',gap:Spacing.sm}});
