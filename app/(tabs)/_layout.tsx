import { Tabs } from 'expo-router';
import React from 'react';

import { AppTabBar } from '@/components/ui/app-tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Mappa' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profilo' }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}
