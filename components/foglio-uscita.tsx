import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { Chip } from '@/components/ui/chip';
import { velo } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { apriUscita, chiudiUscita, getMieUscite } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { getCity, isWithinCity } from '@/lib/cities';
import { useCity } from '@/lib/city-context';
import { messaggioServer } from '@/lib/errori';
import { useFoglioUscita } from '@/lib/foglio-uscita-context';
import { zonaAmmessa, zonaDaCoordinate } from '@/lib/geocoding';
import { getCurrentCoords, type Coords } from '@/lib/location';
import { durateRapide, finoAlle, FORME, type FormaUscita } from '@/lib/uscite';

/** L'ultima forma e durata scelte: e' cio' che rende il secondo uso da due tocchi. */
const PREFERENZA = 'btb:uscita.preferenza.v1';

/**
 * «SONO FUORI» — due tocchi, quindici secondi.
 *
 * IL CONTRO-ESEMPIO da cui nasce questa schermata e' app/create-request.tsx:
 * un modulo cosi' lungo da aver avuto bisogno di una bozza persistita con
 * debounce. Salvare una bozza e' la confessione che compilare e' un lavoro.
 * Questo foglio non salva bozze, e un test lo verifica.
 *
 * COSA LO RENDE DA DUE TOCCHI, in concreto:
 *
 *  - forma e durata arrivano gia' scelte, dall'ultima volta. Si persiste la
 *    PREFERENZA (due valori), non la bozza (il contenuto): la preferenza rende
 *    il secondo uso piu' veloce, la bozza renderebbe il primo piu' lento
 *    perche' implica che ci sia qualcosa da salvare.
 *  - la posizione non si chiede. Parte il GPS in sottofondo e la riga sotto le
 *    chip diventa «San Salvario · dal tuo telefono». E' informativa, non un
 *    campo. Solo se il GPS manca o cade fuori citta' compare qualcosa da fare.
 *  - la nota e' facoltativa e resta vuota.
 *
 * Le due frasi «puoi rientrare quando vuoi» e «si chiude da sola» non sono
 * decorazione: dichiarare a un'app dove sei e' la cosa che fa esitare di piu',
 * e sono le due righe che tolgono l'esitazione. Se si tagliano per fare
 * spazio, la funzione la usa meno gente.
 */
export function FoglioUscita() {
  const c = useColors();
  const toast = useToast();
  const { city } = useCity();
  const { aperto, chiudi, mia, aggiorna, precompilazione } = useFoglioUscita();

  const [forma, setForma] = useState<FormaUscita>('negozio');
  const [durata, setDurata] = useState(1);
  const [nota, setNota] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [cercandoPosizione, setCercandoPosizione] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const durate = durateRapide();

  // All'avvio dell'app: se c'e' gia' un'uscita aperta a mio nome, la barra
  // deve dirlo subito. Senza, una persona non saprebbe di essere ancora
  // "fuori" da ieri sera.
  useEffect(() => {
    let vivo = true;
    getMieUscite()
      .then((mie) => {
        if (vivo) aggiorna(mie[0] ?? null);
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, [aggiorna]);

  // All'apertura: preferenze dall'ultima volta, poi GPS in sottofondo.
  useEffect(() => {
    if (!aperto) return;
    setErrore(null);
    setNota(precompilazione?.nota ?? '');

    (async () => {
      try {
        const salvata = await AsyncStorage.getItem(PREFERENZA);
        if (salvata) {
          const p = JSON.parse(salvata) as { forma?: FormaUscita; durata?: number };
          if (p.forma) setForma(p.forma);
          if (typeof p.durata === 'number') setDurata(p.durata);
        }
      } catch {
        // senza preferenza si parte dai default: costa un tocco in piu', non un errore
      }
      if (precompilazione?.tipo) setForma(precompilazione.tipo);
    })();

    if (precompilazione?.lat != null && precompilazione.lng != null) {
      setCoords({ lat: precompilazione.lat, lng: precompilazione.lng });
      setZona(precompilazione.zona ?? null);
      return;
    }

    setCercandoPosizione(true);
    (async () => {
      const trovate = await getCurrentCoords();
      setCoords(trovate);
      setCercandoPosizione(false);
      if (trovate) {
        // SOLO IL QUARTIERE. reverseGeocode darebbe «Via Po 12, Torino», e
        // questa riga la legge chiunque in citta': era la via di casa di una
        // persona, pubblicata a tutti.
        const nome = await zonaDaCoordinate(trovate).catch(() => null);
        setZona(zonaAmmessa(nome) ? nome : null);
      }
    })();
  }, [aperto, precompilazione]);

  const dentroCitta = coords ? isWithinCity(coords, getCity(city.key)) : false;

  const pubblica = useCallback(async () => {
    if (!coords) return;
    setSalvando(true);
    setErrore(null);
    try {
      await apriUscita({
        tipo: forma,
        citta: city.key,
        lat: coords.lat,
        lng: coords.lng,
        finisceAlle: durate[durata].fino.toISOString(),
        nota: nota.trim() || undefined,
        zona: zona ?? undefined,
      });
      await AsyncStorage.setItem(PREFERENZA, JSON.stringify({ forma, durata })).catch(() => null);
      if (Platform.OS !== 'web') {
        // Uno dei pochi punti dove l'aptico ha senso: e' un'azione vera, non
        // una navigazione.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
      }
      const mie = await getMieUscite().catch(() => []);
      aggiorna(mie[0] ?? null);
      chiudi();
      toast.show(`Ci sei ${finoAlle(durate[durata].fino.toISOString())}. Puoi rientrare quando vuoi.`);
    } catch (e) {
      setErrore(messaggioServer(e, 'L’uscita non è partita. Riprova.'));
    } finally {
      setSalvando(false);
    }
  }, [coords, forma, city.key, durate, durata, nota, zona, aggiorna, chiudi, toast]);

  const rientra = useCallback(async () => {
    if (!mia) return;
    setSalvando(true);
    try {
      await chiudiUscita(mia.id);
      aggiorna(null);
      chiudi();
      toast.show('Sei rientrato.');
    } catch (e) {
      setErrore(messaggioServer(e, 'Non si è chiusa. Riprova.'));
    } finally {
      setSalvando(false);
    }
  }, [mia, aggiorna, chiudi, toast]);

  return (
    <Modal visible={aperto} transparent animationType="fade" onRequestClose={chiudi}>
      <Animated.View entering={velo} style={[styles.velo, { backgroundColor: c.overlay }]}>
        <Pressable style={styles.sopra} onPress={chiudi} accessibilityLabel="Chiudi" />
        <ThemedView style={[styles.foglio, { backgroundColor: c.surface }]}>
          <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
            {mia ? (
              <>
                <ThemedText type="label" style={{ color: c.textSecondary }}>SEI FUORI</ThemedText>
                <ThemedText type="title">{finoAlle(mia.finisceAlle).toUpperCase()}</ThemedText>
                <ThemedText style={{ color: c.textSecondary }}>
                  Si chiude da sola. Non resta niente aperto a tua insaputa.
                </ThemedText>
                <Button label="Non ci vado più" variant="secondary" loading={salvando} onPress={rientra} />
              </>
            ) : (
              <>
                <ThemedText type="label" style={{ color: c.textSecondary }}>STASERA</ThemedText>
                <ThemedText type="title">CI SEI?</ThemedText>

                <View style={styles.chip}>
                  {FORME.map((f) => (
                    <Chip
                      key={f.key}
                      label={f.titolo}
                      active={f.key === forma}
                      onPress={() => setForma(f.key)}
                    />
                  ))}
                </View>
                <ThemedText style={{ color: c.textSecondary }}>
                  {FORME.find((f) => f.key === forma)?.spiega}
                </ThemedText>

                <ThemedText type="label" style={{ color: c.textSecondary }}>FINO A QUANDO</ThemedText>
                <View style={styles.chip}>
                  {durate.map((d, i) => (
                    <Chip key={d.label} label={d.label} active={i === durata} onPress={() => setDurata(i)} />
                  ))}
                </View>

                {/* Informativa, non un campo: la posizione non si chiede. */}
                <ThemedText style={{ color: c.textSecondary }}>
                  {cercandoPosizione
                    ? 'Sto guardando dove sei…'
                    : !coords
                      ? 'Senza posizione non posso dirlo a nessuno. Attiva il GPS e riapri.'
                      : !dentroCitta
                        ? `Sembri fuori da ${city.label}. Cambia città dal feed, oppure avvicinati.`
                        : `${zona ?? city.label} · dal tuo telefono`}
                </ThemedText>

                <TextField
                  label="Due parole, se vuoi"
                  value={nota}
                  onChangeText={setNota}
                  placeholder="Passo dal minimarket, serve niente?"
                  multiline
                />
                <ThemedText type="caption" style={{ color: c.textSecondary }}>
                  La legge chiunque in città. Non scriverci il tuo indirizzo: la zona la
                  aggiungiamo noi, e si ferma al quartiere.
                </ThemedText>

                {errore ? <ThemedText style={{ color: c.danger }}>{errore}</ThemedText> : null}

                <Button
                  label="Sono fuori"
                  loading={salvando}
                  disabled={!coords || !dentroCitta}
                  onPress={pubblica}
                />
                <ThemedText style={{ color: c.textSecondary }}>
                  Si chiude da sola {finoAlle(durate[durata].fino.toISOString())}. Puoi rientrare quando vuoi.
                </ThemedText>
              </>
            )}
          </ScrollView>
        </ThemedView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  sopra: { flex: 1 },
  foglio: { borderTopLeftRadius: Radii.lg, borderTopRightRadius: Radii.lg, maxHeight: '85%' },
  contenuto: { padding: Spacing.md, gap: Spacing.sm },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
