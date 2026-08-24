import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { LocationField, mancanzaPosizione, type LocationValue } from '@/components/location-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { useToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { createEvent } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useCity } from '@/lib/city-context';

/** Giorni selezionabili per il ritrovo (label → offset in giorni da oggi). */
const DAYS = [
  { label: 'Oggi', offset: 0 },
  { label: 'Domani', offset: 1 },
  { label: 'Dopodomani', offset: 2 },
];

/** Organizza un "giro di birra" di gruppo aperto alla città. */
export default function NewEventScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { city } = useCity();

  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [luogo, setLuogo] = useState('');
  // Le coordinate valgono per un evento esattamente come per un giro: senza,
  // l'incontro non compare sulla mappa e chi legge non sa dove sia.
  const [posizione, setPosizione] = useState<LocationValue>({ indirizzo: '', coords: null });
  const [dayOffset, setDayOffset] = useState(0);
  const [ora, setOra] = useState('21:00');
  const [posti, setPosti] = useState('6');
  const [saving, setSaving] = useState(false);

  function buildQuando(): string | null {
    const m = ora.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, min, 0, 0);
    return d.toISOString();
  }

  async function handleCreate() {
    const cleanTitle = titolo.trim();
    if (cleanTitle.length < 3) {
      Alert.alert('Titolo troppo corto', 'Dai un nome al tuo giro (almeno 3 caratteri).');
      return;
    }
    const quando = buildQuando();
    if (!quando) {
      Alert.alert('Ora non valida', "Usa il formato 24h, es. 21:00.");
      return;
    }
    const manca = mancanzaPosizione(posizione, "l'indirizzo del ritrovo");
    if (manca) {
      Alert.alert(
        'Manca il posto esatto',
        `Serve ancora ${manca}. Senza il punto sulla mappa chi legge non sa dove presentarsi, e l'incontro non compare fra i segnaposto.`,
      );
      return;
    }
    const nPosti = Math.max(2, Math.min(50, Number(posti) || 6));

    setSaving(true);
    try {
      const id = await createEvent({
        titolo: cleanTitle,
        descrizione,
        luogo,
        quando,
        citta: city.key,
        lat: posizione.coords?.lat ?? null,
        lng: posizione.coords?.lng ?? null,
        posti: nPosti,
      });
      toast.show('Incontro pubblicato.');
      router.replace({ pathname: '/event/[id]', params: { id } } as never);
    } catch {
      Alert.alert('Errore', 'Non è stato possibile creare il giro. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Organizza un giro' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={{ color: c.textSecondary }}>
          Proponi un ritrovo aperto alla community di {city.label}. Chi vuole si unisce e vi conoscete di persona.
        </ThemedText>

        <TextField label="Titolo" value={titolo} onChangeText={setTitolo} placeholder="Es. Aperitivo al parco" />
        <TextField
          label="Descrizione (facoltativa)"
          value={descrizione}
          onChangeText={setDescrizione}
          placeholder="Due parole sul ritrovo…"
          multiline
        />
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Dove</ThemedText>
          <LocationField
            city={city}
            value={posizione}
            onChange={setPosizione}
            label={`Indirizzo del ritrovo a ${city.label}`}
            placeholder="Via, piazza o parco"
            mapTitle="Tocca il punto del ritrovo"
            mapHint={`${city.label} — sposta e zooma la mappa, poi tocca dove vi trovate.`}
          />
        </View>
        {/* Il dettaglio umano resta: l'indirizzo dice la via, questo dice
            in quale angolo cercarvi. */}
        <TextField
          label="Punto preciso (facoltativo)"
          value={luogo}
          onChangeText={setLuogo}
          placeholder="Es. panchine dietro la fontana"
        />

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Quando</ThemedText>
          <View style={styles.chips}>
            {DAYS.map((d) => (
              <Chip
                key={d.offset}
                label={d.label}
                active={d.offset === dayOffset}
                onPress={() => setDayOffset(d.offset)}
              />
            ))}
          </View>
        </View>

        <TextField label="Ora (24h)" value={ora} onChangeText={setOra} placeholder="21:00" keyboardType="numbers-and-punctuation" />
        <TextField label="Posti" value={posti} onChangeText={setPosti} placeholder="6" keyboardType="number-pad" />

        <Button label="Pubblica l’incontro" onPress={handleCreate} loading={saving} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
