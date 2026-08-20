import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { adminGetProductFeedback } from '@/data/api';
import type { ProductFeedback } from '@/types';

export default function AdminFeedbackScreen(){const[items,setItems]=useState<ProductFeedback[]>([]);useEffect(()=>{adminGetProductFeedback().then(setItems).catch(()=>setItems([]))},[]);const text=useMemo(()=>items.map(x=>`[${new Date(x.createdAt).toLocaleString('it-IT')}] ${x.kind.toUpperCase()} · ${x.userName??x.userId} · ${x.appVersion??''}\n${x.message}`).join('\n\n---\n\n'),[items]);return <ThemedView style={styles.container}><Stack.Screen options={{title:'Feedback tester'}}/><View style={styles.actions}><ThemedText>{items.length} messaggi raccolti in un unico testo</ThemedText><Button label="Esporta testo" size="md" variant="secondary" onPress={()=>Share.share({title:'BeerToBeer feedback',message:text||'Nessun feedback'})}/></View><ScrollView contentContainerStyle={styles.content}><ThemedText selectable style={styles.text}>{text||'Nessun feedback ricevuto.'}</ThemedText></ScrollView></ThemedView>}
const styles=StyleSheet.create({container:{flex:1},actions:{padding:Spacing.md,gap:Spacing.sm},content:{padding:Spacing.md},text:{lineHeight:22}});
