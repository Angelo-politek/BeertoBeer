import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPickerMap } from '@/components/location-picker-map';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { City } from '@/lib/cities';
import type { Coords } from '@/lib/location';

type Props = {
  visible: boolean;
  city: City;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (input: { nome: string; coords: Coords }) => void;
};

/** Aggiunge un negozio ("bangladino") alla mappa community: nome + punto sulla mappa. */
export function AddShopModal({ visible, city, loading, onClose, onSubmit }: Props) {
  const c = useColors();
  const [nome, setNome] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);

  function handleSubmit() {
    if (!nome.trim() || !coords) return;
    onSubmit({ nome: nome.trim(), coords });
    setNome('');
    setCoords(null);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Aggiungi un negozio</ThemedText>
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              Segnala un bangladino a {city.label}: aiuti i driver a trovare quello più vicino.
            </ThemedText>
          </View>
          <View style={styles.form}>
            <TextField
              label="Nome del negozio"
              value={nome}
              onChangeText={setNome}
              placeholder="Es. Minimarket Via Po"
            />
            <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
              {coords ? '📍 Punto selezionato' : 'Tocca la posizione del negozio sulla mappa:'}
            </ThemedText>
          </View>
          <LocationPickerMap center={city.center} onPick={setCoords} zoom={13} />
          <View style={styles.footer}>
            <Button label="Annulla" variant="secondary" onPress={onClose} style={styles.button} />
            <Button
              label="Aggiungi"
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
