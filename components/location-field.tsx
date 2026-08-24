import { useState } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPickerMap } from '@/components/location-picker-map';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { isWithinCity, type City } from '@/lib/cities';
import { geocodeAddress, reverseGeocode } from '@/lib/geocoding';
import { getCurrentCoords, type Coords } from '@/lib/location';
// Il tipo e la regola «senza coordinate non si pubblica» vivono in lib/:
// logica pura, provabile senza la mappa nativa. Qui si riesportano perché le
// schermate importino una cosa sola.
import { mancanzaPosizione, type LocationValue } from '@/lib/posizione';

export { mancanzaPosizione, type LocationValue };

/**
 * IL CAMPO POSIZIONE, UNO SOLO PER TUTTA L'APP.
 *
 * Questa logica è nata dentro la schermata «Lancia un giro» ed era rimasta
 * lì: gli eventi avevano solo un campo di testo libero, quindi chi leggeva un
 * evento non sapeva dove fosse, l'evento non compariva sulla mappa e non
 * aveva una distanza.
 *
 * Copiare il codice nella schermata degli eventi sarebbe stata la strada
 * corta; fra un mese le due schermate si sarebbero comportate in modo
 * diverso, perché una correzione sarebbe finita in una sola delle due. È
 * esattamente il modo in cui in questo progetto sono già nati i bug più
 * fastidiosi.
 *
 * Le tre strade per dire «dove» sono qui, e sono le stesse ovunque:
 *   1. GPS del telefono          → controllato contro il confine della città
 *   2. indirizzo scritto         → cercato SOLO dentro la città
 *   3. punto toccato sulla mappa → sempre valido, è l'ultima spiaggia
 *
 * Regola invariabile: senza coordinate non si pubblica. Un indirizzo scritto
 * a mano e mai confermato manda una persona a girare per niente.
 *
 * Componente CONTROLLATO: lo stato vive nella schermata che lo usa, perché
 * «Lancia un giro» salva la bozza mentre si scrive e deve poterla rileggere.
 */

type Props = {
  city: City;
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Etichetta del campo. Esempi: «Indirizzo di consegna», «Dove ci si trova». */
  label: string;
  placeholder?: string;
  /** Titolo e sottotitolo della mappa a schermo intero. */
  mapTitle?: string;
  mapHint?: string;
};

/**
 * Perche' la ricerca non ha funzionato, detto in modo utile.
 *
 * Le tre cause sono diverse e vanno dette diverse: se a chi ha scritto un
 * indirizzo giusto si dice che non esiste, va a correggerlo e peggiora. E se
 * l'indirizzo e' in un altro comune, dirgli QUALE comune e' l'informazione che
 * risolve il problema in un secondo.
 */
function spiegazione(
  esito: { ok: false; motivo: 'non-trovato' | 'servizio' } | { ok: false; motivo: 'altra-citta'; comune: string },
  citta: string,
): [string, string] {
  if (esito.motivo === 'servizio') {
    return [
      'Ricerca non disponibile',
      'Il servizio mappe non risponde in questo momento. Riprova fra poco, oppure scegli subito il punto sulla mappa.',
    ];
  }
  if (esito.motivo === 'altra-citta') {
    return [
      `Quell'indirizzo è a ${esito.comune}`,
      `Beer to Beer funziona dentro ${citta}: chi porta si muove a piedi o in bici, e ${esito.comune} è un altro comune. Cerca un indirizzo in ${citta}, oppure cambia città dal feed.`,
    ];
  }
  return [
    'Indirizzo non trovato',
    `Nessun risultato a ${citta}. Scrivilo in modo più preciso (via e numero civico) oppure scegli il punto sulla mappa.`,
  ];
}

export function LocationField({ city, value, onChange, label, placeholder, mapTitle, mapHint }: Props) {
  const c = useColors();
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPick, setMapPick] = useState<Coords | null>(null);

  const { indirizzo, coords } = value;

  /**
   * GPS: prende la posizione del telefono, controlla che sia dentro la città
   * scelta e prova a ricavarne la via. Se la via non si ricava il punto resta
   * comunque salvato: l'indirizzo scritto serve solo a orientarsi, quello che
   * conta sono le coordinate.
   */
  async function usaLaMiaPosizione() {
    setLocating(true);
    try {
      const qui = await getCurrentCoords();
      if (!qui) {
        Alert.alert(
          'Posizione non disponibile',
          'Attiva il GPS e concedi il permesso di localizzazione, oppure scegli il punto sulla mappa.',
        );
        return;
      }
      if (!isWithinCity(qui, city)) {
        Alert.alert(
          'Sei fuori città',
          `La tua posizione non risulta dentro ${city.label}. Cambia città dal feed, oppure scegli il punto sulla mappa.`,
        );
        return;
      }
      const via = await reverseGeocode(qui);
      if (via) {
        onChange({ indirizzo: via, coords: qui });
      } else {
        onChange({ indirizzo, coords: qui });
        Alert.alert(
          'Punto salvato',
          'Non sono riuscito a ricavare la via: scrivila tu, il punto è già a posto.',
        );
      }
    } finally {
      setLocating(false);
    }
  }

  async function trovaIndirizzo() {
    if (indirizzo.trim().length === 0) {
      Alert.alert('Manca l’indirizzo', 'Scrivi prima l’indirizzo.');
      return;
    }
    setGeocoding(true);
    const esito = await geocodeAddress(indirizzo, city);
    setGeocoding(false);
    // «Non esiste» e «non riesco a chiedere» sono due cose diverse: dire la
    // prima quando è vera la seconda manda a correggere un indirizzo che era
    // già giusto.
    if (!esito.ok) {
      onChange({ indirizzo, coords: null });
      const [titolo, testo] = spiegazione(esito, city.label);
      Alert.alert(titolo, testo);
      return;
    }
    if (!isWithinCity(esito.coords, city)) {
      onChange({ indirizzo, coords: null });
      Alert.alert(
        'Indirizzo fuori città',
        `Il punto trovato è fuori da ${city.label}. Controlla l'indirizzo o scegli il punto sulla mappa.`,
      );
      return;
    }
    onChange({ indirizzo, coords: esito.coords });
  }

  /** Ricerca silenziosa quando il campo perde il focus: se riesce bene, se no nessun avviso. */
  async function cercaInSilenzio() {
    if (indirizzo.trim().length === 0 || coords) return;
    setGeocoding(true);
    const esito = await geocodeAddress(indirizzo, city);
    setGeocoding(false);
    if (esito.ok && isWithinCity(esito.coords, city)) onChange({ indirizzo, coords: esito.coords });
  }

  async function confermaPuntoMappa() {
    if (!mapPick) return;
    setMapOpen(false);
    // Precompila l'indirizzo dal punto scelto (poi resta modificabile).
    const via = await reverseGeocode(mapPick);
    onChange({ indirizzo: via ?? indirizzo, coords: mapPick });
  }

  return (
    <>
      <TextField
        label={label}
        value={indirizzo}
        onChangeText={(t) => onChange({ indirizzo: t, coords: null })} // testo cambiato: va ri-cercato
        onBlur={cercaInSilenzio}
        placeholder={placeholder ?? 'Via e numero civico'}
      />
      <Button
        label={locating ? 'Rilevamento…' : '📍 Usa la mia posizione'}
        variant="secondary"
        onPress={usaLaMiaPosizione}
        loading={locating}
      />
      <View style={styles.riga}>
        <Button
          label={coords ? 'Posizione trovata' : 'Trova indirizzo'}
          variant="secondary"
          onPress={trovaIndirizzo}
          loading={geocoding}
          style={styles.mezzo}
        />
        <Button
          label="Scegli sulla mappa"
          variant="secondary"
          onPress={() => {
            setMapPick(coords);
            setMapOpen(true);
          }}
          style={styles.mezzo}
        />
      </View>

      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <ThemedView style={styles.pieno}>
          <SafeAreaView style={styles.pieno} edges={['top', 'bottom']}>
            <View style={styles.intestazione}>
              <ThemedText type="subtitle">{mapTitle ?? 'Tocca il punto esatto'}</ThemedText>
              <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                {mapHint ?? `${city.label} — sposta e zooma la mappa, poi tocca il punto.`}
              </ThemedText>
            </View>
            <LocationPickerMap center={coords ?? city.center} value={mapPick} onPick={setMapPick} />
            <View style={styles.piede}>
              <Button label="Annulla" variant="secondary" onPress={() => setMapOpen(false)} style={styles.mezzo} />
              <Button label="Conferma punto" onPress={confermaPuntoMappa} disabled={!mapPick} style={styles.mezzo} />
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pieno: { flex: 1 },
  riga: { flexDirection: 'row', gap: Spacing.sm },
  mezzo: { flex: 1 },
  intestazione: { padding: Spacing.md, gap: 4 },
  piede: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
});
