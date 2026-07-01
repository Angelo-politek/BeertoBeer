import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { createOrder, getCreditBalance } from '@/data/api';
import { DEFAULT_FORMAT, estimateCredits, FORMATS } from '@/lib/credits';
import { geocodeAddress } from '@/lib/geocoding';
import type { Coords } from '@/lib/location';
import type { BeerItem } from '@/types';

type BeerInput = { nome: string; quantita: string; formato: string };

const FASCE = ['Adesso', 'Tra 1 ora', 'Stasera', 'Domani'];

export default function CreateRequestScreen() {
  const c = useColors();
  const router = useRouter();

  const [birre, setBirre] = useState<BeerInput[]>([{ nome: '', quantita: '', formato: DEFAULT_FORMAT }]);
  const [indirizzo, setIndirizzo] = useState('');
  const [fascia, setFascia] = useState(FASCE[0]);
  const [vibeMode, setVibeMode] = useState(false);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getCreditBalance()
      .then((b) => active && setBalance(b))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function updateBeer(index: number, field: keyof BeerInput, value: string) {
    setBirre((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }
  function addBeer() {
    setBirre((prev) => [...prev, { nome: '', quantita: '', formato: DEFAULT_FORMAT }]);
  }
  function removeBeer(index: number) {
    setBirre((prev) => prev.filter((_, i) => i !== index));
  }

  // Lista birre "pulita" per stima e invio.
  const cleanBirre: BeerItem[] = birre
    .filter((b) => b.nome.trim().length > 0)
    .map((b) => ({ nome: b.nome.trim(), quantita: Math.max(1, Number(b.quantita) || 1), formato: b.formato }));

  const stima = estimateCredits(cleanBirre, coords);
  const nonCopribile = balance != null && stima > balance;

  async function handleFindAddress() {
    if (indirizzo.trim().length === 0) {
      Alert.alert('Manca l’indirizzo', 'Scrivi prima l’indirizzo di consegna.');
      return;
    }
    setGeocoding(true);
    const found = await geocodeAddress(indirizzo);
    setGeocoding(false);
    if (!found) {
      setCoords(null);
      Alert.alert('Indirizzo non trovato', 'Prova a scriverlo in modo più preciso (via, numero, città).');
      return;
    }
    setCoords(found);
  }

  // Geocoding automatico quando l'indirizzo perde il focus, così la stima crediti
  // include SUBITO la distanza (senza dover toccare il bottone). Silenzioso.
  async function geocodeSilently() {
    if (indirizzo.trim().length === 0 || coords) return;
    setGeocoding(true);
    const found = await geocodeAddress(indirizzo);
    setGeocoding(false);
    if (found) setCoords(found);
  }

  function errorMessage(e: unknown): string {
    return (e as { message?: string })?.message ?? 'Non è stato possibile pubblicare la richiesta.';
  }

  async function handleSubmit() {
    if (cleanBirre.length === 0) {
      Alert.alert('Manca qualcosa', 'Indica almeno una birra.');
      return;
    }
    if (indirizzo.trim().length === 0) {
      Alert.alert('Manca qualcosa', 'Indica un indirizzo di consegna.');
      return;
    }
    setSubmitting(true);
    try {
      // Assicura le coordinate (geocode al volo se non già trovate).
      let point = coords;
      if (!point) {
        point = await geocodeAddress(indirizzo);
        if (point) setCoords(point);
      }
      // Ricontrollo la copertura con le coordinate reali (distanza inclusa) PRIMA
      // di inviare: così non mostro "ok" per poi ricevere un errore dal trigger.
      const costoReale = estimateCredits(cleanBirre, point);
      if (balance != null && costoReale > balance) {
        setSubmitting(false);
        Alert.alert(
          'Crediti insufficienti',
          `Questa richiesta costa ${costoReale} crediti e ne hai ${balance}. Guadagnane consegnando, oppure riduci l'ordine.`,
        );
        return;
      }
      const newId = await createOrder({
        birre: cleanBirre,
        indirizzo,
        fascia,
        vibeMode,
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
      });
      router.replace({ pathname: '/request/[id]', params: { id: newId } });
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Errore', errorMessage(e));
    }
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
              <View key={i} style={styles.beerBlock}>
                <View style={styles.beerRow}>
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
                {/* Formato (incide sul peso → sui crediti) */}
                <View style={styles.formatRow}>
                  {FORMATS.map((f) => {
                    const selected = b.formato === f.key;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => updateBeer(i, 'formato', f.key)}
                        style={[
                          styles.formatChip,
                          {
                            backgroundColor: selected ? c.accent : c.surface,
                            borderColor: selected ? c.accent : c.border,
                          },
                        ]}>
                        <Text style={{ color: selected ? c.accentText : c.text, fontSize: 13, fontWeight: '600' }}>
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            <Pressable onPress={addBeer} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.addBeer, { color: c.accent }]}>{"+ Aggiungi un'altra birra"}</Text>
            </Pressable>
          </View>

          {/* Indirizzo + geocoding */}
          <TextField
            label="Indirizzo di consegna"
            value={indirizzo}
            onChangeText={(t) => {
              setIndirizzo(t);
              setCoords(null); // l'indirizzo è cambiato: va ri-cercato
            }}
            onBlur={geocodeSilently}
            placeholder="Via, numero, città"
          />
          <Button
            label={coords ? '📍 Posizione trovata' : 'Trova indirizzo sulla mappa'}
            variant="secondary"
            onPress={handleFindAddress}
            loading={geocoding}
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
                    <Text style={{ color: selected ? c.accentText : c.text, fontWeight: '600' }}>{f}</Text>
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

          {/* Stima crediti (calcolati da peso + distanza) */}
          <View style={[styles.creditsCard, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
            <ThemedText style={{ color: c.textSecondary }}>Crediti richiesti (stima)</ThemedText>
            <ThemedText type="title" style={{ color: c.accent }}>
              {stima} crediti
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              Calcolati automaticamente da peso e distanza
              {coords ? '' : ' (aggiungi l’indirizzo per includere la distanza)'}.
              {balance != null ? ` Hai ${balance} crediti.` : ''}
            </ThemedText>
            {nonCopribile ? (
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>
                Non hai abbastanza crediti: guadagnane consegnando, oppure riduci l’ordine.
              </ThemedText>
            ) : null}
          </View>

          <Button
            label="Pubblica richiesta"
            onPress={handleSubmit}
            loading={submitting}
            disabled={nonCopribile}
          />
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
  beerBlock: { gap: Spacing.xs },
  beerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  beerName: { flex: 1 },
  beerQty: { width: 72, textAlign: 'center' },
  remove: { padding: Spacing.xs },
  removeText: { fontSize: 18, fontWeight: '700' },
  formatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, paddingBottom: Spacing.xs },
  formatChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
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
  creditsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
