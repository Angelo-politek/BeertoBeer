import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type BeerInput = { nome: string; quantita: string };

const FASCE = ['Adesso', 'Tra 1 ora', 'Stasera', 'Domani'];

export default function CreateRequestScreen() {
  const c = useColors();
  const router = useRouter();

  const [birre, setBirre] = useState<BeerInput[]>([{ nome: '', quantita: '' }]);
  const [indirizzo, setIndirizzo] = useState('');
  const [fascia, setFascia] = useState(FASCE[0]);
  const [vibeMode, setVibeMode] = useState(false);
  const [crediti, setCrediti] = useState('');

  function updateBeer(index: number, field: keyof BeerInput, value: string) {
    setBirre((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addBeer() {
    setBirre((prev) => [...prev, { nome: '', quantita: '' }]);
  }

  function removeBeer(index: number) {
    setBirre((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const hasBeer = birre.some((b) => b.nome.trim().length > 0);
    if (!hasBeer) {
      Alert.alert('Manca qualcosa', 'Indica almeno una birra.');
      return;
    }
    if (indirizzo.trim().length === 0) {
      Alert.alert('Manca qualcosa', 'Indica un indirizzo di consegna.');
      return;
    }
    Alert.alert(
      'Richiesta creata',
      'In questa demo (Fase 0) la richiesta non viene salvata: comparirà davvero nel Feed quando collegheremo il backend in Fase 1.',
      [{ text: 'Ok', onPress: () => router.back() }],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Nuova richiesta' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Birre */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Cosa vuoi ordinare?</Text>
            {birre.map((b, i) => (
              <View key={i} style={styles.beerRow}>
                <TextInput
                  value={b.nome}
                  onChangeText={(t) => updateBeer(i, 'nome', t)}
                  placeholder="Tipo di birra (es. Ichnusa)"
                  placeholderTextColor={c.textSecondary}
                  style={[
                    styles.input,
                    styles.beerName,
                    { color: c.text, borderColor: c.border, backgroundColor: c.surface },
                  ]}
                />
                <TextInput
                  value={b.quantita}
                  onChangeText={(t) => updateBeer(i, 'quantita', t.replace(/[^0-9]/g, ''))}
                  placeholder="Qtà"
                  placeholderTextColor={c.textSecondary}
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    styles.beerQty,
                    { color: c.text, borderColor: c.border, backgroundColor: c.surface },
                  ]}
                />
                {birre.length > 1 ? (
                  <Pressable onPress={() => removeBeer(i)} style={styles.remove}>
                    <Text style={[styles.removeText, { color: c.danger }]}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable onPress={addBeer} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.addBeer, { color: c.accent }]}>+ Aggiungi un'altra birra</Text>
            </Pressable>
          </View>

          <TextField
            label="Indirizzo di consegna"
            value={indirizzo}
            onChangeText={setIndirizzo}
            placeholder="Via, numero, città"
          />

          {/* Fascia oraria */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Quando</Text>
            <View style={styles.chips}>
              {FASCE.map((f) => {
                const selected = f === fascia;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFascia(f)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? c.accent : c.surface,
                        borderColor: selected ? c.accent : c.border,
                      },
                    ]}>
                    <Text style={{ color: selected ? c.accentText : c.text, fontWeight: '600' }}>
                      {f}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Vibe mode */}
          <View style={[styles.vibeRow, { borderColor: c.border, backgroundColor: c.surface }]}>
            <View style={styles.vibeText}>
              <ThemedText type="defaultSemiBold">✨ Vibe mode</ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                Invita chi consegna a fermarsi a bere insieme.
              </ThemedText>
            </View>
            <Switch value={vibeMode} onValueChange={setVibeMode} />
          </View>

          <TextField
            label="Crediti offerti"
            value={crediti}
            onChangeText={(t) => setCrediti(t.replace(/[^0-9]/g, ''))}
            placeholder="Es. 10"
            keyboardType="number-pad"
          />

          <Button label="Pubblica richiesta" onPress={handleSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    height: 48,
  },
  beerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  beerName: { flex: 1 },
  beerQty: { width: 72, textAlign: 'center' },
  remove: { padding: Spacing.xs },
  removeText: { fontSize: 18, fontWeight: '700' },
  addBeer: { fontSize: 15, fontWeight: '600', paddingVertical: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  vibeText: { flex: 1, gap: 2 },
});
