import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { DiscoveryFilters } from '@/types';

const STORAGE_KEY = 'btb.discovery.filters.v2';
export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  vibeOnly: false,
  maxDistanceKm: null,
  time: 'all',
  sort: 'smart',
};

type DiscoveryContextValue = {
  filters: DiscoveryFilters;
  ready: boolean;
  activeCount: number;
  updateFilters: (patch: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState(DEFAULT_DISCOVERY_FILTERS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setFilters({ ...DEFAULT_DISCOVERY_FILTERS, ...JSON.parse(raw) });
      })
      .catch(() => null)
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: DiscoveryFilters) => {
    setFilters(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => null);
  }, []);

  const updateFilters = useCallback((patch: Partial<DiscoveryFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => null);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => persist(DEFAULT_DISCOVERY_FILTERS), [persist]);
  const activeCount = Number(filters.vibeOnly) + Number(filters.maxDistanceKm != null) + Number(filters.time !== 'all') + Number(filters.sort !== 'smart');
  const value = useMemo(() => ({ filters, ready, activeCount, updateFilters, resetFilters }), [filters, ready, activeCount, updateFilters, resetFilters]);
  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscoveryFilters() {
  const value = useContext(DiscoveryContext);
  if (!value) throw new Error('useDiscoveryFilters must be used inside DiscoveryProvider');
  return value;
}
