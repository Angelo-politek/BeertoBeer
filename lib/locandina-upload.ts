import { VOCE } from '@/constants/testi';

import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

/**
 * LA LOCANDINA DI UN EVENTO.
 *
 * Segnalazione del collaudo: «quando creo un incontro o evento devo poter
 * caricare anche una foto (magari la locandina di un evento in un pub)».
 *
 * Stessa strada gia' collaudata per le foto profilo (lib/avatar-upload.ts):
 * si sceglie, si carica, si ottiene un indirizzo pubblico. Cambia solo la
 * proporzione — una locandina e' verticale, non quadrata — e il contenitore.
 *
 * `expo-image-picker` e' gia' installato e configurato in app.json: nessuna
 * dipendenza nativa nuova, quindi questo arriva via etere e nessuno deve
 * reinstallare l'app.
 */
export async function scegliECaricaLocandina(userId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(VOCE.foto.permessoNegato);
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    // Proporzione da manifesto: e' come sono fatte le locandine dei locali.
    aspect: [3, 4],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset.base64) throw new Error(VOCE.foto.nonLeggibile);

  const ext = (asset.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const contentType = asset.mimeType ?? 'image/jpeg';
  // La cartella e' l'id di chi carica: le regole del contenitore permettono di
  // scrivere solo dentro la propria, cosi' nessuno sovrascrive la locandina
  // di un altro.
  const path = `${userId}/locandina-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('eventi')
    .upload(path, decode(asset.base64), { contentType, upsert: true });
  if (error) throw error;

  return supabase.storage.from('eventi').getPublicUrl(path).data.publicUrl;
}
