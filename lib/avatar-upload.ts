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

  const { data: files, error: listError } = await supabase.storage.from('avatars').list(userId, {
    limit: 100,
  });
  if (!listError) {
    const oldFiles = (files ?? [])
      .filter((file) => file.id !== null && file.name.startsWith('avatar-'))
      .map((file) => `${userId}/${file.name}`)
      .filter((filePath) => filePath !== path);
    if (oldFiles.length > 0) {
      await supabase.storage.from('avatars').remove(oldFiles);
    }
  }

  return publicUrl;
}

/** Carica o sostituisce una delle quattro foto della vetrina profilo. */
export async function pickAndUploadProfilePhoto(userId: string, position: number): Promise<{ id: string; url: string; storagePath: string; position: number } | null> {
  if (position < 0 || position > 3) throw new Error('Posizione foto non valida.');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permesso per accedere alle foto negato.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.72, base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Immagine non leggibile.');
  const ext = (asset.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const storagePath = `${userId}/profile-${position}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(
    storagePath, decode(asset.base64), { contentType: asset.mimeType ?? 'image/jpeg', upsert: false },
  );
  if (uploadError) throw uploadError;
  const url = supabase.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
  const { data: old } = await supabase.from('profile_photos').select('storage_path').eq('user_id', userId).eq('position', position).maybeSingle();
  const { data, error } = await supabase.from('profile_photos').upsert(
    { user_id: userId, position, url, storage_path: storagePath }, { onConflict: 'user_id,position' },
  ).select('id').single();
  if (error) { await supabase.storage.from('avatars').remove([storagePath]); throw error; }
  if (position === 0) await supabase.from('users').update({ foto_url: url }).eq('id', userId);
  if (old?.storage_path && old.storage_path !== storagePath) await supabase.storage.from('avatars').remove([old.storage_path]);
  return { id: (data as { id: string }).id, url, storagePath, position };
}
