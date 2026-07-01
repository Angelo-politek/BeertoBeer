import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

/**
 * Apre la galleria, fa scegliere e ritagliare un'immagine quadrata, la carica su
 * Supabase Storage (bucket `avatars`, cartella `<uid>/`) e aggiorna users.foto_url.
 * Ritorna l'URL pubblico della nuova foto, oppure null se l'utente annulla.
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Permesso per accedere alle foto negato.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Immagine non leggibile.');

  const ext = (asset.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const contentType = asset.mimeType ?? 'image/jpeg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, decode(asset.base64), { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;

  const { error: updateError } = await supabase
    .from('users')
    .update({ foto_url: publicUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return publicUrl;
}
