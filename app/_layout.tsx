import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { ToastProvider } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { getOnboardingCompleted, updateUserCity } from '@/data/api';
import { getOnboardingSignal, resetOnboardingSignal, subscribeOnboardingSignal } from '@/lib/onboarding-signal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { SessionProvider, useSession } from '@/lib/auth-context';
import { CityProvider, useCity } from '@/lib/city-context';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { supabaseConfigError } from '@/lib/supabase';

// Crash & error monitoring (solo build release: in dev gli errori si vedono
// già in console). Il DSN non è un segreto.
Sentry.init({
  dsn: 'https://a68771bbdcf8ffd303f083cf35279982@o4511671935959040.ingest.de.sentry.io/4511671940808784',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
});

export const unstable_settings = {
  anchor: '(tabs)',
};

// Temi di navigazione allineati alla palette "Craft & Warm": così anche le
// superfici gestite da React Navigation (header, sfondi di transizione)
// restano calde invece dei grigi di default.
const WarmLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.accent,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.accent,
  },
};

const WarmDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.accent,
  },
};

/**
 * Decide cosa mostrare in base alla sessione:
 * - mentre carica la sessione → loader;
 * - niente sessione → gruppo (auth) (Accedi/Registrati);
 * - sessione presente → (tabs).
 */
function RootNavigator() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const c = useColors();

  // Stato onboarding: null = ancora da controllare. Serve a forzare il nuovo
  // onboarding a chi non l'ha ancora completato (nuovi utenti E beta esistenti,
  // che partono da onboarding_completed = false dopo la migration).
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setOnboardingDone(null);
      resetOnboardingSignal();
      return;
    }
    let active = true;
    getOnboardingCompleted()
      .then((done) => {
        // Il segnale locale (onboarding appena completato in questa sessione)
        // ha priorità: evita che il guard rispedisca l'utente all'onboarding.
        if (active) setOnboardingDone(done || getOnboardingSignal());
      })
      .catch(() => {
        // In caso di errore non blocchiamo l'utente fuori dall'app.
        if (active) setOnboardingDone(true);
      });
    return () => {
      active = false;
    };
  }, [session]);

  // Quando l'onboarding viene completato, aggiorna subito lo stato del guard.
  useEffect(() => subscribeOnboardingSignal((v) => setOnboardingDone(v)), []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }
    if (!session) return;

    // Sessione presente: aspetta di sapere lo stato onboarding prima di decidere.
    if (onboardingDone === null) return;

    if (!onboardingDone && !inOnboarding) {
      // Non ha (ancora) completato l'onboarding: forzalo. Copre i beta esistenti
      // al primo avvio dopo l'update e i nuovi device.
      router.replace('/onboarding');
    } else if (onboardingDone && (inAuthGroup || inOnboarding)) {
      // Completato ma fermo su auth/onboarding: entra nell'app.
      router.replace('/(tabs)');
    } else if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router, onboardingDone]);

  useEffect(() => {
    if (!session) return;
    registerForPushNotifications().catch(() => null);
  }, [session]);

  // Sincronizza sul server la città selezionata (serve alle push "nuova
  // richiesta in città"). Best-effort.
  const { city, hasChosen } = useCity();
  useEffect(() => {
    if (!session || !hasChosen) return;
    updateUserCity(city.key).catch(() => null);
  }, [session, hasChosen, city.key]);

  // Tap su una notifica → naviga al deep link in data.url (anche a freddo:
  // getLastNotificationResponseAsync copre l'app aperta DALLA notifica).
  const handledNotificationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session) return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const id = response.notification.request.identifier;
      if (handledNotificationRef.current === id) return; // anti doppio (cold start + listener)
      handledNotificationRef.current = id;
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url as never);
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [session, router]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        // Header uniforme per tutte le schermate secondarie: fondo caldo,
        // nessuna riga d'ombra, titolo bold e back ambrato.
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerTintColor: c.accent,
        headerTitleStyle: { fontWeight: '800', fontSize: 18, color: c.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

function RootLayout() {
  const colorScheme = useColorScheme();

  // Aggiornamenti OTA automatici: al lancio controlla, scarica e applica SUBITO
  // (il default di expo-updates scarica al lancio ma applica solo al successivo).
  // Best-effort: qualsiasi errore lascia partire la versione corrente.
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // rete assente o server updates irraggiungibile: si prosegue normalmente
      }
    })();
  }, []);

  if (supabaseConfigError) {
    return (
      <View style={styles.configError}>
        <Text style={styles.configErrorTitle}>Configurazione mancante</Text>
        <Text style={styles.configErrorText}>
          Variabili Supabase assenti dal bundle. In dev controlla il file .env; in una build EAS
          controlla il blocco &quot;env&quot; del profilo in eas.json, poi rigenera la build.
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? WarmDarkTheme : WarmLightTheme}>
      <SessionProvider>
        <CityProvider>
          <ToastProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </ToastProvider>
        </CityProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#1a1a1a',
  },
  configErrorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  configErrorText: {
    color: '#cccccc',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
