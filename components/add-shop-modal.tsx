import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPickerMap } from '@/components/location-picker-map';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FUORI, VOCE } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { City } from '@/lib/cities';
import type { Coords } from '@/lib/location';

type Props = {
  visible: boolean;
  city: City;
  loading?: boolean;
  userCoords?: Coords | null;
  onClose: () => void;
  onSubmit: (input: { nome: string; coords: Coords; orari?: string }) => void;
};

/**
 * Propone un negozio ("bangladino") per la mappa community: nome, orari stimati
 * e punto sulla mappa. Compare pubblicamente dopo l'approvazione di un admin.
 */
export function AddShopModal({ visible, city, loading, userCoords, onClose, onSubmit }: Props) {
  const c = useColors();
  const [nome, setNome] = useState('');
  const [orari, setOrari] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);

  function handleSubmit() {
    if (!nome.trim() || !coords) return;
    onSubmit({ nome: nome.trim(), coords, orari: orari.trim() || undefined });
    setNome('');
    setOrari('');
    setCoords(null);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{FUORI.negozio.segnala}</ThemedText>
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              Segnala un negozio a {city.label}: aiuti la community a trovare quello più vicino.
            </ThemedText>
          </View>
          <View style={styles.form}>
            <TextField
              label={FUORI.negozio.nome}
              value={nome}
              onChangeText={setNome}
              placeholder={FUORI.negozio.nomeSegnaposto}
            />
            <TextField
              label={FUORI.negozio.orari}
              value={orari}
              onChangeText={setOrari}
              placeholder={FUORI.negozio.orariSegnaposto}
            />
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              {coords ? FUORI.negozio.puntoScelto : FUORI.negozio.toccaPosizione}
            </ThemedText>
          </View>
          <LocationPickerMap center={userCoords ?? city.center} userCoords={userCoords} value={coords} onPick={setCoords} zoom={15} />
          <View style={styles.footer}>
            <Button label={VOCE.azione.annulla} variant="secondary" onPress={onClose} style={styles.button} />
            <Button
              label={FUORI.negozio.aggiungi}
              onPress={handleSubmit}
              loading={loading}
              disabled={!nome.trim() || !coords}
              style={styles.button}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: 2 },
  form: { padding: Spacing.md, gap: Spacing.xs },
  footer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  button: { flex: 1 },
});
