import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPickerMap } from '@/components/location-picker-map';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { BrandIcon } from '@/components/ui/brand-icon';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { createOrder, getAvailableCredits, getCurrentUser } from '@/data/api';
import { isWithinCity } from '@/lib/cities';
import { useCity } from '@/lib/city-context';
import { CREDIT_CAP, DEFAULT_FORMAT, estimateCredits, FORMATS, maxDistanceBonus } from '@/lib/credits';
import { geocodeAddress, reverseGeocode } from '@/lib/geocoding';
import { getCurrentCoords, type Coords } from '@/lib/location';
import type { BeerItem } from '@/types';

type BeerInput = { nome: string; quantita: string; formato: string };

const FASCE = ['Adesso', 'Tra 1 ora', 'Stasera', 'Domani'];
const DRAFT_KEY = 'btb.giro-composer.draft.v21';

export default function CreateRequestScreen() {
  const c = useColors();
  const router = useRouter();
  const { city } = useCity();

  const [birre, setBirre] = useState<BeerInput[]>([{ nome: '', quantita: '', formato: DEFAULT_FORMAT }]);
  const [indirizzo, setIndirizzo] = useState('');
  const [fascia, setFascia] = useState(FASCE[0]);
  const [vibeMode, setVibeMode] = useState(false);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [sospesoFino, setSospesoFino] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPick, setMapPick] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    // Il saldo che conta è il DISPONIBILE: i BeerCoin promessi a giri ancora
    // aperti sono già impegnati e non si possono spendere di nuovo.
    Promise.all([getCurrentUser(), getAvailableCredits()])
      .then(([u, disponibili]) => {
        if (!active) return;
        setBalance(disponibili);
        setSospesoFino(u.sospesoFino ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!raw) return;
      const draft = JSON.parse(raw) as { birre?: BeerInput[]; indirizzo?: string; fascia?: string; vibeMode?: boolean; coords?: Coords | null };
      if (draft.birre?.length) setBirre(draft.birre);
      if (draft.indirizzo) setIndirizzo(draft.indirizzo);
      if (draft.fascia) setFascia(draft.fascia);
      if (draft.vibeMode != null) setVibeMode(draft.vibeMode);
      if (draft.coords) setCoords(draft.coords);
    }).catch(() => null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ birre, indirizzo, fascia, vibeMode, coords })).catch(() => null), 350);
    return () => clearTimeout(timer);
  }, [birre, indirizzo, fascia, vibeMode, coords]);

  // Moderazione: sospeso finché la data è nel futuro (il server è il gate vero).
  const suspended = sospesoFino != null && new Date(sospesoFino).getTime() > Date.now();

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

  const stima = estimateCredits(cleanBirre);
  const bonusMax = maxDistanceBonus(cleanBirre);
  const nonCopribile = balance != null && stima > balance;

  // Cosa manca davvero per pubblicare: dirlo qui evita di far premere a vuoto
  // il bottone e di scoprire il problema con un avviso a schermo intero.
  const mancanze = [
    cleanBirre.length === 0 ? 'almeno una birra' : null,
    indirizzo.trim().length === 0 ? "l'indirizzo di consegna" : null,
    indirizzo.trim().length > 0 && !coords ? "la conferma dell'indirizzo sulla mappa" : null,
  ].filter((x): x is string => x !== null);

  /**
   * Rilevamento automatico: prende la posizione del telefono, controlla che sia
   * dentro la città scelta e prova a ricavarne la via. Se la via non si ricava,
   * il punto resta comunque salvato: l'indirizzo scritto serve solo al driver
   * per orientarsi, la consegna segue le coordinate.
   */
  async function handleUseMyPosition() {
    setLocating(true);
    try {
      const here = await getCurrentCoords();
      if (!here) {
        Alert.alert(
          'Posizione non disponibile',
          'Attiva il GPS e concedi il permesso di localizzazione, oppure scegli il punto sulla mappa.',
        );
        return;
      }
      if (!isWithinCity(here, city)) {
        Alert.alert(
          'Sei fuori città',
          `La tua posizione non risulta dentro ${city.label}. Cambia città dal feed, oppure scegli il punto sulla mappa.`,
        );
        return;
      }
      setCoords(here);
      const label = await reverseGeocode(here);
      if (label) {
        setIndirizzo(label);
      } else {
        Alert.alert(
          'Punto salvato',
          'Non sono riuscito a ricavare la via: scrivila tu, il punto di consegna è già a posto.',
        );
      }
    } finally {
      setLocating(false);
    }
  }

  async function handleFindAddress() {
    if (indirizzo.trim().length === 0) {
      Alert.alert('Manca l’indirizzo', 'Scrivi prima l’indirizzo di consegna.');
      return;
    }
    setGeocoding(true);
    const esito = await geocodeAddress(indirizzo, city);
    setGeocoding(false);
    // "Non esiste" e "non riesco a chiedere" sono due cose diverse: dire la
    // prima quando è vera la seconda manda l'utente a correggere un indirizzo
    // che era già giusto.
    if (!esito.ok) {
      setCoords(null);
      Alert.alert(
        esito.motivo === 'servizio' ? 'Ricerca non disponibile' : 'Indirizzo non trovato',
        esito.motivo === 'servizio'
          ? 'Il servizio mappe non risponde in questo momento. Riprova fra poco, oppure scegli subito il punto sulla mappa.'
          : `Nessun risultato a ${city.label}. Scrivilo in modo più preciso (via e numero) oppure scegli il punto sulla mappa.`,
      );
      return;
    }
    const found = esito.coords;
    if (!isWithinCity(found, city)) {
      setCoords(null);
      Alert.alert(
        'Indirizzo fuori città',
        `Il punto trovato è fuori da ${city.label}. Controlla l'indirizzo o scegli il punto sulla mappa.`,
      );
      return;
    }
    setCoords(found);
  }

  // Geocoding automatico (vincolato alla città) quando l'indirizzo perde il focus.
  async function geocodeSilently() {
    if (indirizzo.trim().length === 0 || coords) return;
    setGeocoding(true);
    const esito = await geocodeAddress(indirizzo, city);
    setGeocoding(false);
    if (esito.ok && isWithinCity(esito.coords, city)) setCoords(esito.coords);
  }

  async function handleMapConfirm() {
    if (!mapPick) return;
    setCoords(mapPick);
    setMapOpen(false);
    // Precompila l'indirizzo dal punto scelto (poi resta modificabile).
    const label = await reverseGeocode(mapPick);
    if (label) setIndirizzo(label);
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
      // Assicura le coordinate (geocode al volo, vincolato alla città, se mancano).
      let point = coords;
      if (!point) {
        const esito = await geocodeAddress(indirizzo, city);
        if (esito.ok && isWithinCity(esito.coords, city)) {
          point = esito.coords;
          setCoords(esito.coords);
        }
      }
      // Senza coordinate il giro è inconsegnabile: non compare sulla mappa, non
      // ha distanza e chi accetta scopre solo dopo dove dovrebbe andare. Prima
      // si pubblicava lo stesso, aggirando anche il vincolo della città.
      if (!point) {
        setSubmitting(false);
        Alert.alert(
          'Indirizzo da confermare',
          `Non riesco a posizionare "${indirizzo.trim()}" dentro ${city.label}. Usa "Usa la mia posizione", oppure scegli il punto sulla mappa: senza il punto esatto chi consegna non saprebbe dove andare.`,
        );
        return;
      }
      if (balance != null && stima > balance) {
        setSubmitting(false);
        Alert.alert(
          'Crediti insufficienti',
          `Questa richiesta costa ${stima} BeerCoin e ne hai ${balance} disponibili. Gli altri sono impegnati in giri ancora aperti: chiudili, guadagnane consegnando, oppure riduci l'ordine.`,
        );
        return;
      }
      const newId = await createOrder({
        birre: cleanBirre,
        indirizzo,
        fascia,
        vibeMode,
        citta: city.key,
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
      });
      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => null);
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
          {/* Qui c'era una barra a 5 passi che restava sempre ferma sul primo:
              il passo attivo era scritto fisso nel codice. Al suo posto, sotto,
              c'è l'elenco di cosa manca davvero per pubblicare. */}
          {/* Banner moderazione: account sospeso */}
          {suspended ? (
            <View style={[styles.suspendedBanner, { backgroundColor: c.dangerSoft }]}>
              <ThemedText type="defaultSemiBold" style={{ color: c.danger }}>
                Account temporaneamente sospeso
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                Una tua richiesta è stata segnalata ed è in verifica. Potrai pubblicare di nuovo dal{' '}
                {new Date(sospesoFino as string).toLocaleString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                , o prima se la moderazione approva la richiesta.
              </ThemedText>
            </View>
          ) : null}

          {/* Birre */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Cosa ti serve?</Text>
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
                    <BrandIcon name="x-mark" size={18} color={c.danger} />
                    </Pressable>
                  ) : null}
                </View>
                {/* Formato (incide sul peso → sui crediti) */}
                <View style={styles.formatRow}>
                  {FORMATS.map((f) => (
                    <Chip
                      key={f.key}
                      label={f.label}
                      active={b.formato === f.key}
                      onPress={() => updateBeer(i, 'formato', f.key)}
                    />
                  ))}
                </View>
              </View>
            ))}
            <Pressable onPress={addBeer} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <View style={styles.addRow}><BrandIcon name="plus" size={17} color={c.accent} /><Text style={[styles.addBeer, { color: c.accent }]}>Aggiungi un&apos;altra birra</Text></View>
            </Pressable>
          </View>

          {/* Indirizzo + geocoding (vincolato alla città selezionata nel feed) */}
          <TextField
            label={`Indirizzo di consegna a ${city.label}`}
            value={indirizzo}
            onChangeText={(t) => {
              setIndirizzo(t);
              setCoords(null); // l'indirizzo è cambiato: va ri-cercato
            }}
            onBlur={geocodeSilently}
            placeholder="Via e numero civico"
          />
          <Button
            label={locating ? 'Rilevamento…' : '📍 Usa la mia posizione'}
            variant="secondary"
            onPress={handleUseMyPosition}
            loading={locating}
          />
          <View style={styles.addressButtons}>
            <Button
              label={coords ? 'Posizione trovata' : 'Trova indirizzo'}
              variant="secondary"
              onPress={handleFindAddress}
              loading={geocoding}
              style={styles.addressButton}
            />
            <Button
              label="Scegli sulla mappa"
              variant="secondary"
              onPress={() => {
                setMapPick(coords);
                setMapOpen(true);
              }}
              style={styles.addressButton}
            />
          </View>

          {/* Fascia oraria */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Quando</Text>
            <View style={styles.chips}>
              {FASCE.map((f) => (
                <Chip key={f} label={f} active={f === fascia} onPress={() => setFascia(f)} />
              ))}
            </View>
          </View>

          {/* Vibe mode */}
          <View style={[styles.vibeRow, { backgroundColor: c.surfaceAlt }]}>
            <View style={styles.vibeText}>
              <ThemedText type="defaultSemiBold">Vibe mode</ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                Invita chi consegna a fermarsi a bere insieme.
              </ThemedText>
            </View>
            <Switch value={vibeMode} onValueChange={setVibeMode} />
          </View>

          {/* Stima crediti: parte peso subito, bonus distanza quando un driver accetta */}
          <View style={[styles.creditsCard, { backgroundColor: c.accentSoft }]}>
            <ThemedText type="label" style={{ color: c.accentStrong }}>
              BEERCOIN DEL GIRO
            </ThemedText>
            <ThemedText type="title" style={{ color: c.accentStrong }}>
              {stima} BeerCoin
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              Calcolati dal peso delle birre.
              {bonusMax > 0
                ? ` Quando un driver accetta si aggiunge un bonus in base alla sua distanza (fino a +${bonusMax}, massimo ${CREDIT_CAP} totali).`
                : ` Sei già al massimo di ${CREDIT_CAP} crediti per consegna.`}
              {balance != null ? ` Hai ${balance} BeerCoin disponibili.` : ''}
            </ThemedText>
            {nonCopribile ? (
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>
                Non hai abbastanza BeerCoin disponibili: gli altri sono impegnati in giri ancora aperti.
              </ThemedText>
            ) : null}
          </View>

          {mancanze.length > 0 ? (
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              Per pubblicare manca ancora: {mancanze.join(' · ')}.
            </ThemedText>
          ) : null}

          <Button
            label="Pubblica il giro"
            onPress={handleSubmit}
            loading={submitting}
            disabled={nonCopribile || suspended}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker del punto di consegna sulla mappa (centrata sulla città) */}
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.mapHeader}>
              <ThemedText type="subtitle">Tocca il punto di consegna</ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {city.label} — sposta e zooma la mappa, poi tocca dove consegnare.
              </ThemedText>
            </View>
            <LocationPickerMap center={coords ?? city.center} value={mapPick} onPick={setMapPick} />
            <View style={styles.mapFooter}>
              <Button label="Annulla" variant="secondary" onPress={() => setMapOpen(false)} style={styles.addressButton} />
              <Button label="Conferma punto" onPress={handleMapConfirm} disabled={!mapPick} style={styles.addressButton} />
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 14 },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    height: 50,
  },
  beerBlock: { gap: Spacing.xs },
  beerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  beerName: { flex: 1 },
  beerQty: { width: 72, textAlign: 'center' },
  remove: { padding: Spacing.xs },
  removeText: { fontFamily: Fonts.sansBold, fontSize: 18 },
  formatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, paddingBottom: Spacing.xs },
  addBeer: { fontFamily: Fonts.sansBold, fontSize: 15, paddingVertical: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  vibeText: { flex: 1, gap: 2 },
  creditsCard: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  suspendedBanner: { borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.xs },
  addressButtons: { flexDirection: 'row', gap: Spacing.sm },
  addressButton: { flex: 1 },
  mapHeader: { padding: Spacing.md, gap: 2 },
  mapFooter: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
