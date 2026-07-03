import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { ToastProvider } from '@/components/toast';
import { updateUserCity } from '@/data/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { SessionProvider, useSession } from '@/lib/auth-context';
import { CityProvider, useCity } from '@/lib/city-context';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { supabaseConfigError } from '@/lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
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

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

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
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
