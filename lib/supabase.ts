import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True se le variabili EXPO_PUBLIC_* non sono state inlined nel bundle
 * (manca il .env in dev, o manca il blocco `env` in eas.json per le build EAS).
 * Non lanciamo a import-time: un throw qui crasha l'app all'avvio senza alcun
 * messaggio in una build release. Il RootLayout mostra una schermata di errore.
 */
export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey;

if (supabaseConfigError) {
  console.error(
    'Variabili Supabase mancanti. In dev: controlla il file .env e riavvia Expo. ' +
      'In build EAS: controlla il blocco "env" del profilo in eas.json.',
  );
}

/**
 * Client Supabase condiviso dall'app.
 * - La sessione è persistita su AsyncStorage → l'utente resta loggato tra i riavvii.
 * - detectSessionInUrl è false perché su mobile non c'è una URL del browser.
 * - flowType 'pkce': i link inviati per email (recupero password e conferma
 *   iscrizione) arrivano con un parametro `?code=` da scambiare con
 *   exchangeCodeForSession. Senza questa riga il client usa il flusso
 *   predefinito, che manda il token in un frammento `#access_token=...`: le
 *   schermate di recupero cercano `code`, non lo trovano mai, e ogni link
 *   risulta "non più valido". È anche il flusso raccomandato su mobile,
 *   perché il token non transita mai in chiaro nell'URL.
 */
export const supabase = createClient(
  supabaseUrl ?? 'https://config-mancante.supabase.co',
  supabaseAnonKey ?? 'anon-key-mancante',
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
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
