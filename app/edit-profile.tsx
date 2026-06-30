import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { getCurrentUser } from '@/data/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = getCurrentUser();

  const [nome, setNome] = useState(user.nome);
  const [eta, setEta] = useState(String(user.eta));
  const [bio, setBio] = useState(user.bio);
  const [preferenze, setPreferenze] = useState(user.preferenzeBirra ?? '');

  function handleSave() {
    if (nome.trim().length === 0) {
      Alert.alert('Manca qualcosa', 'Il nome non può essere vuoto.');
      return;
    }
    Alert.alert(
      'Profilo aggiornato',
      'In questa demo (Fase 0) le modifiche non vengono salvate. Diventeranno reali in Fase 1 con il backend.',
      [{ text: 'Ok', onPress: () => router.back() }],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Modifica profilo' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Il tuo nome" />
          <TextField
            label="Età"
            value={eta}
            onChangeText={(t) => setEta(t.replace(/[^0-9]/g, ''))}
            placeholder="Es. 24"
            keyboardType="number-pad"
          />
          <TextField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Due parole su di te"
            multiline
          />
          <TextField
            label="Preferenze birra"
            value={preferenze}
            onChangeText={setPreferenze}
            placeholder="Es. IPA, birre artigianali"
          />
          <Button label="Salva modifiche" onPress={handleSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
});
