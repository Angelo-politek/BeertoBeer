import { Image } from 'expo-image';
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
import { createEvent, getCurrentUser } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useCity } from '@/lib/city-context';
import { messaggioServer } from '@/lib/errori';
import { scegliECaricaLocandina } from '@/lib/locandina-upload';

/** Giorni selezionabili per il ritrovo (label → offset in giorni da oggi). */
const DAYS = [
  { label: 'Oggi', offset: 0 },
  { label: 'Domani', offset: 1 },
  { label: 'Dopodomani', offset: 2 },
];

/**
 * Un orario di partenza sensato: la prossima mezz'ora piena, almeno un'ora da
 * adesso. Prima era fisso alle 21:00, quindi chi organizzava dopo cena creava
 * un incontro già nel passato senza accorgersene — è così che il collaudo del
 * 24/08 alle 23:22 ha prodotto un incontro a cui non ci si poteva unire.
 */
function prossimoOrarioSensato(adesso = new Date()): string {
  const d = new Date(adesso.getTime() + 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Organizza un "giro di birra" di gruppo aperto alla città. */
export default function NewEventScreen() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { city } = useCity();

  /**
   * Incontro o evento. Deciso con Alessio: INCONTRO e' spontaneo e lo crea
   * chiunque (due birre al parco); EVENTO succede in un locale, ha una
   * locandina ed e' aperto a piu' gente.
   */
  const [tipo, setTipo] = useState<'incontro' | 'evento'>('incontro');
  const [locandina, setLocandina] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [luogo, setLuogo] = useState('');
  // Le coordinate valgono per un evento esattamente come per un giro: senza,
  // l'incontro non compare sulla mappa e chi legge non sa dove sia.
  const [posizione, setPosizione] = useState<LocationValue>({ indirizzo: '', coords: null });
  const [dayOffset, setDayOffset] = useState(0);
  const [ora, setOra] = useState(prossimoOrarioSensato);
  const [posti, setPosti] = useState('6');
  const [saving, setSaving] = useState(false);

  async function caricaLocandina() {
    setCaricando(true);
    try {
      const me = await getCurrentUser();
      const url = await scegliECaricaLocandina(me.id);
      if (url) setLocandina(url);
    } catch (e) {
      Alert.alert('Locandina non caricata', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setCaricando(false);
    }
  }

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
      Alert.alert('Titolo troppo corto', 'Dagli un nome (almeno 3 caratteri).');
      return;
    }
    const quando = buildQuando();
    if (!quando) {
      Alert.alert('Ora non valida', "Usa il formato 24h, es. 21:00.");
      return;
    }
    // Un incontro nel passato si pubblica, poi non ci si può unire e sembra
    // rotta l'app invece che sbagliato l'orario. Meglio dirlo subito.
    if (new Date(quando).getTime() <= Date.now()) {
      Alert.alert(
        'Orario già passato',
        'Questo momento è già trascorso. Scegli un altro giorno o sposta l’ora più avanti.',
      );
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
        tipo,
        locandinaUrl: locandina,
        descrizione,
        luogo,
        quando,
        citta: city.key,
        lat: posizione.coords?.lat ?? null,
        lng: posizione.coords?.lng ?? null,
        posti: nPosti,
      });
      toast.show(tipo === 'evento' ? 'Evento pubblicato.' : 'Incontro pubblicato.');
      router.replace({ pathname: '/event/[id]', params: { id } } as never);
    } catch (e) {
      Alert.alert('Non pubblicato', messaggioServer(e, 'Riprova fra poco.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: tipo === 'evento' ? 'Nuovo evento' : 'Nuovo incontro' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* La scelta per prima: cambia il senso di tutto quello che viene dopo. */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Che cos e</ThemedText>
          <View style={styles.chips}>
            <Chip label="Incontro" active={tipo === 'incontro'} onPress={() => setTipo('incontro')} />
            <Chip label="Evento" active={tipo === 'evento'} onPress={() => setTipo('evento')} />
          </View>
          <ThemedText type="caption" style={{ color: c.textSecondary }}>
            {tipo === 'incontro'
              ? `Due birre in compagnia, lo organizzi tu. Aperto a chi vuole unirsi a ${city.label}.`
              : `Qualcosa che succede in un locale: un concerto, una serata, una degustazione. Puoi metterci la locandina.`}
          </ThemedText>
        </View>

        {tipo === 'evento' ? (
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Locandina (facoltativa)</ThemedText>
            {locandina ? (
              <Image source={{ uri: locandina }} style={styles.locandina} contentFit="cover" />
            ) : null}
            <Button
              label={caricando ? 'Carico...' : locandina ? 'Cambia locandina' : 'Aggiungi la locandina'}
              variant="secondary"
              size="md"
              loading={caricando}
              onPress={caricaLocandina}
            />
          </View>
        ) : null}

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

        <Button label={tipo === 'evento' ? 'Pubblica l evento' : 'Pubblica l incontro'} onPress={handleCreate} loading={saving} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  locandina: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12 },
});
