import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Card } from '@/components/card';
import { LocationField, mancanzaPosizione, type LocationValue } from '@/components/location-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { BrandIcon } from '@/components/ui/brand-icon';
import { GLOSSARY } from '@/constants/branding';
import { GIRO } from '@/constants/testi';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { createOrder, getAvailableCredits, getCurrentUser, getUscita } from '@/data/api';
import { finoAlle, formaDi } from '@/lib/uscite';
import { isWithinCity } from '@/lib/cities';
import { useCity } from '@/lib/city-context';
import { CREDIT_CAP, DEFAULT_FORMAT, estimateCredits, FORMATS, maxDistanceBonus } from '@/lib/credits';
import { messaggioServer } from '@/lib/errori';
import { birreTotali, MAX_BIRRE_PER_GIRO } from '@/lib/limiti';
import { geocodeAddress } from '@/lib/geocoding';
import { type Coords } from '@/lib/location';
import type { BeerItem, Uscita } from '@/types';

type BeerInput = { nome: string; quantita: string; formato: string };

const FASCE = GIRO.lancia.fasce;
const DRAFT_KEY = 'btb.giro-composer.draft.v21';

export default function CreateRequestScreen() {
  const c = useColors();
  const router = useRouter();
  const { city } = useCity();

  const [birre, setBirre] = useState<BeerInput[]>([{ nome: '', quantita: '', formato: DEFAULT_FORMAT }]);
  const [indirizzo, setIndirizzo] = useState('');
  const [fascia, setFascia] = useState<string>(FASCE[0]);
  /**
   * Se arrivo da un'uscita, la schermata lo dice in cima e il giro se lo
   * ricorda. Le due cose che la macchina non puo' sapere — dove consegnare e
   * cosa vuoi — restano da compilare: precompilarle sarebbe indovinare.
   */
  const { a: daUscitaId } = useLocalSearchParams<{ a?: string }>();
  const [uscita, setUscita] = useState<Uscita | null>(null);
  useEffect(() => {
    if (!daUscitaId) return;
    getUscita(daUscitaId).then(setUscita).catch(() => null);
  }, [daUscitaId]);
  const [vibeMode, setVibeMode] = useState(false);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [sospesoFino, setSospesoFino] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Indirizzo e coordinate restano due stati separati perché la bozza salvata
  // su disco ha sempre avuto questa forma; qui vengono solo affacciati al
  // componente condiviso, che li tratta come una cosa sola.
  const posizione: LocationValue = { indirizzo, coords };
  function setPosizione(next: LocationValue) {
    setIndirizzo(next.indirizzo);
    setCoords(next.coords);
  }

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

  // Righe con quantità o formato ma senza nome: vengono scartate in silenzio
  // sia dalla stima sia dalla pubblicazione. Meglio dirlo prima.
  const righeIncomplete = birre.length - cleanBirre.length;

  const stima = estimateCredits(cleanBirre);
  const bonusMax = maxDistanceBonus(cleanBirre);
  const nonCopribile = balance != null && stima > balance;

  // Il tetto vero lo applica il database: qui si dice prima, mentre si scrive,
  // invece di far premere «Pubblica» e rispondere con un errore.
  const totaleBirre = birreTotali(cleanBirre);
  const troppeBirre = totaleBirre > MAX_BIRRE_PER_GIRO;

  // Cosa manca davvero per pubblicare: dirlo qui evita di far premere a vuoto
  // il bottone e di scoprire il problema con un avviso a schermo intero.
  const mancanze = [
    cleanBirre.length === 0 ? GIRO.lancia.mancaBirra : null,
    mancanzaPosizione({ indirizzo, coords }, GIRO.lancia.mancaIndirizzo),
  ].filter((x): x is string => x !== null);


  async function handleSubmit() {
    if (cleanBirre.length === 0) {
      Alert.alert(GIRO.lancia.mancaTitolo, GIRO.lancia.mancaBirraAvviso);
      return;
    }
    if (indirizzo.trim().length === 0) {
      Alert.alert(GIRO.lancia.mancaTitolo, GIRO.lancia.mancaIndirizzoAvviso);
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
          GIRO.lancia.indirizzoTitolo,
          GIRO.lancia.indirizzoTesto(indirizzo.trim(), city.label),
        );
        return;
      }
      if (balance != null && stima > balance) {
        setSubmitting(false);
        Alert.alert(GIRO.lancia.saldoTitolo, GIRO.lancia.saldoTesto(stima, balance));
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
        daUscitaId: daUscitaId ?? null,
      });
      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => null);
      router.replace({ pathname: '/request/[id]', params: { id: newId } });
    } catch (e) {
      setSubmitting(false);
      // I limiti nuovi (troppe birre, troppi giri aperti, indirizzo fuori
      // città) arrivano come messaggio dal database: vanno mostrati come sono,
      // perché dicono esattamente cosa fare.
      Alert.alert(GIRO.lancia.nonPubblicatoTitolo, messaggioServer(e, GIRO.lancia.nonPubblicatoTesto));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: GLOSSARY.createDeliveryTitle }} />
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
                {GIRO.lancia.sospesoTitolo}
              </ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {GIRO.lancia.sospesoTesto(
                  new Date(sospesoFino as string).toLocaleString('it-IT', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                )}
              </ThemedText>
            </View>
          ) : null}

          {/*
            Da chi stai rispondendo. Sta in cima, prima di qualunque campo,
            perche' e' il contesto che rende il resto comprensibile — e perche'
            dice subito una cosa vera: il giro non e' riservato a quella
            persona. Meglio saperlo adesso che scoprirlo dopo.
          */}
          {uscita ? (
            <Card style={[styles.section, { borderColor: c.accent, borderWidth: 1 }]}>
              <ThemedText type="label" style={{ color: c.accent }}>{GIRO.lancia.rispondiA}</ThemedText>
              {/* type="nome": il nome di una persona non si urla. */}
              <ThemedText type="nome">{uscita.persona.nome}</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>
                {GIRO.lancia.rispondiANota(
                  formaDi(uscita.tipo).titolo,
                  uscita.zona,
                  finoAlle(uscita.finisceAlle),
                )}
              </ThemedText>
            </Card>
          ) : null}

          {/* 1 — COSA */}
          <Card style={styles.section}>
            <ThemedText type="label">{GIRO.lancia.cosa}</ThemedText>
            {birre.map((b, i) => (
              <View key={i} style={styles.beerBlock}>
                <View style={styles.beerRow}>
                  <TextInput
                    value={b.nome}
                    onChangeText={(t) => updateBeer(i, 'nome', t)}
                    placeholder={GIRO.lancia.birraSegnaposto}
                    placeholderTextColor={c.textSecondary}
                    style={[
                      styles.input,
                      styles.beerName,
                      { color: c.text, borderColor: c.border, backgroundColor: c.surfaceAlt },
                    ]}
                  />
                  <TextInput
                    value={b.quantita}
                    onChangeText={(t) => updateBeer(i, 'quantita', t.replace(/[^0-9]/g, ''))}
                    placeholder={GIRO.lancia.quantitaSegnaposto}
                    placeholderTextColor={c.textSecondary}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      styles.beerQty,
                      { color: c.text, borderColor: c.border, backgroundColor: c.surfaceAlt },
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
              <View style={styles.addRow}><BrandIcon name="plus" size={17} color={c.accent} /><Text style={[styles.addBeer, { color: c.accent }]}>{GIRO.lancia.aggiungiBirra}</Text></View>
            </Pressable>
            {troppeBirre ? (
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>
                {GIRO.lancia.troppeBirre(totaleBirre, MAX_BIRRE_PER_GIRO)}
              </ThemedText>
            ) : null}
            {righeIncomplete > 0 ? (
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {righeIncomplete === 1 ? GIRO.lancia.rigaSenzaNome : GIRO.lancia.righeSenzaNome(righeIncomplete)}
              </ThemedText>
            ) : null}
          </Card>

          {/* 2 — DOVE (ricerca vincolata alla città selezionata nel feed) */}
          <Card style={styles.section}>
            <ThemedText type="label">{GIRO.lancia.dove}</ThemedText>
            <LocationField
              city={city}
              value={posizione}
              onChange={setPosizione}
              label={GIRO.lancia.indirizzo(city.label)}
              mapTitle={GIRO.lancia.mappaTitolo}
              mapHint={GIRO.lancia.mappaAiuto(city.label)}
            />
          </Card>

          {/* 3 — QUANDO */}
          <Card style={styles.section}>
            <ThemedText type="label">{GIRO.lancia.quando}</ThemedText>
            <View style={styles.chips}>
              {FASCE.map((f) => (
                <Chip key={f} label={f} active={f === fascia} onPress={() => setFascia(f)} />
              ))}
            </View>
          </Card>

          {/* Vibe mode */}
          <View style={[styles.vibeRow, { backgroundColor: c.surfaceAlt }]}>
            <View style={styles.vibeText}>
              <ThemedText type="defaultSemiBold">{GIRO.lancia.vibeTitolo}</ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {GIRO.lancia.vibeTesto}
              </ThemedText>
            </View>
            <Switch value={vibeMode} onValueChange={setVibeMode} />
          </View>

          {/* Stima crediti: parte peso subito, bonus distanza quando un driver accetta */}
          <View style={[styles.creditsCard, { backgroundColor: c.accentSoft }]}>
            <ThemedText type="label" style={{ color: c.accentStrong }}>
              {GIRO.lancia.costo}
            </ThemedText>
            <ThemedText type="title" style={{ color: c.accentStrong }}>
              {GIRO.lancia.quanto(stima)}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              {GIRO.lancia.daPeso}
              {bonusMax > 0
                ? GIRO.lancia.bonusDistanza(bonusMax, CREDIT_CAP)
                : GIRO.lancia.giaAlMassimo(CREDIT_CAP)}
              {balance != null ? GIRO.lancia.disponibili(balance) : ''}
            </ThemedText>
            {nonCopribile ? (
              <ThemedText style={{ color: c.danger, fontSize: 13 }}>
                {GIRO.lancia.nonCopribile}
              </ThemedText>
            ) : null}
          </View>

          {mancanze.length > 0 ? (
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              {GIRO.lancia.manca(mancanze.join(' · '))}
            </ThemedText>
          ) : null}

          <Button
            label={GIRO.lancia.pubblica}
            onPress={handleSubmit}
            loading={submitting}
            disabled={nonCopribile || suspended || troppeBirre}
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
  section: { gap: Spacing.sm },
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
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
