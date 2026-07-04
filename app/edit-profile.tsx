import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getCurrentUser, updateCurrentUserProfile } from '@/data/api';
import { useSession } from '@/lib/auth-context';
import { pickAndUploadAvatar } from '@/lib/avatar-upload';

export default function EditProfileScreen() {
  const router = useRouter();
  const c = useColors();
  const { session } = useSession();
  const userId = session?.user.id;

  // L'età non è qui: deriva da data_nascita (impostata in registrazione) e non si modifica.
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [preferenze, setPreferenze] = useState('');
  const [interessi, setInteressi] = useState('');
  const [cercoCompagnia, setCercoCompagnia] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Prefill dei campi con i dati reali dell'utente.
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((u) => {
        if (!active) return;
        setNome(u.nome);
        setBio(u.bio);
        setPreferenze(u.preferenzeBirra ?? '');
        setInteressi((u.interessi ?? []).join(', '));
        setCercoCompagnia(u.cercoCompagnia ?? false);
        setFotoUrl(u.fotoUrl);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // La foto si salva subito al momento della scelta (a parte dai campi testo).
  async function handlePickPhoto() {
    if (!userId) return;
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setFotoUrl(url);
    } catch {
      Alert.alert('Foto non caricata', 'Non è stato possibile caricare la foto. Riprova.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setSaveError(null);
    if (nome.trim().length === 0) {
      setSaveError('Il nome non può essere vuoto.');
      return;
    }
    setSaving(true);
    try {
      const tags = interessi
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);
      await updateCurrentUserProfile({
        nome,
        bio,
        preferenzeBirra: preferenze,
        interessi: tags,
        cercoCompagnia,
      });
      router.back();
    } catch {
      setSaveError('Salvataggio non riuscito. Riprova.');
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Modifica profilo' }} />
      {loadingProfile ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : loadError ? (
        // Se il prefill è fallito NON mostriamo il form: salvare ora sovrascriverebbe
        // il profilo reale con campi vuoti. Meglio tornare indietro e riprovare.
        <View style={styles.center}>
          <ThemedText style={{ color: c.danger }}>
            Impossibile caricare il profilo. Riprova.
          </ThemedText>
          <Button label="Torna indietro" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Foto profilo (toccabile → galleria, caricamento immediato) */}
            <View style={styles.avatarBlock}>
              <Pressable
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <Avatar name={nome || 'Tu'} size={96} uri={fotoUrl} />
                {uploadingPhoto ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </Pressable>
              <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
                {uploadingPhoto ? 'Caricamento…' : 'Cambia foto'}
              </ThemedText>
            </View>

            <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Il tuo nome" />
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
            <TextField
              label="Interessi (separati da virgola)"
              value={interessi}
              onChangeText={setInteressi}
              placeholder="Es. calcio, vinili, montagna"
            />

            <Pressable
              onPress={() => setCercoCompagnia((v) => !v)}
              style={({ pressed }) => [
                styles.toggleRow,
                {
                  backgroundColor: cercoCompagnia ? c.accentSoft : c.surfaceAlt,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: cercoCompagnia ? c.accent : c.textSecondary,
                    backgroundColor: cercoCompagnia ? c.accent : 'transparent',
                  },
                ]}>
                {cercoCompagnia ? <View style={[styles.checkboxDot, { backgroundColor: c.accentText }]} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">🍺 Cerco compagnia</ThemedText>
                <ThemedText style={{ color: c.textSecondary, fontSize: 13 }}>
                  Fatti trovare da chi vuole bere una birra in compagnia nella tua zona.
                </ThemedText>
              </View>
            </Pressable>

            {saveError ? <ThemedText style={{ color: c.danger }}>{saveError}</ThemedText> : null}
            <Button label="Salva modifiche" onPress={handleSave} loading={saving} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.md },
  avatarBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 20,
    padding: Spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDot: { width: 10, height: 10, borderRadius: 5 },
});
