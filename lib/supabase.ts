import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variabili Supabase mancanti. Controlla EXPO_PUBLIC_SUPABASE_URL e ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY nel file .env, poi RIAVVIA Expo (Ctrl+C e .\\start.ps1).',
  );
}

/**
 * Client Supabase condiviso dall'app.
 * - La sessione è persistita su AsyncStorage → l'utente resta loggato tra i riavvii.
 * - detectSessionInUrl è false perché su mobile non c'è una URL del browser.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rinfresca il token solo quando l'app è in primo piano (consigliato da Supabase).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
