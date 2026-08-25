import { Tabs } from 'expo-router';
import React from 'react';

import { FoglioUscita } from '@/components/foglio-uscita';
import { AppTabBar } from '@/components/ui/app-tab-bar';
import { FoglioUscitaProvider } from '@/lib/foglio-uscita-context';

/**
 * Il provider sta SOPRA <Tabs>: cosi' la barra puo' leggerlo (il tabBar viene
 * renderizzato dentro l'albero di Tabs) e il foglio si disegna sopra la barra
 * invece che dentro una schermata.
 */
export default function TabLayout() {
  return (
    <FoglioUscitaProvider>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Giri' }} />
        <Tabs.Screen name="map" options={{ title: 'Mappa' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profilo' }} />
        <Tabs.Screen name="community" options={{ href: null }} />
        <Tabs.Screen name="wallet" options={{ href: null }} />
      </Tabs>
      <FoglioUscita />
    </FoglioUscitaProvider>
  );
}
