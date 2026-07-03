import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_CITY_KEY, getCity, type City } from '@/lib/cities';
import { getSelectedCityKey, setSelectedCityKey } from '@/lib/preferences';

type CityContextValue = {
  /** Città correntemente selezionata (mai null: fallback alla default). */
  city: City;
  /** true finché la preferenza non è stata letta da AsyncStorage. */
  ready: boolean;
  /** true se l'utente ha già scelto una città (letta o appena impostata). */
  hasChosen: boolean;
  /** Cambia città e persiste la scelta. */
  setCityKey: (key: string) => void;
};

const CityContext = createContext<CityContextValue | null>(null);

/**
 * Selezione città condivisa da feed, creazione richiesta e onboarding.
 * La scelta è persistita localmente: al riavvio l'app riparte dalla stessa città.
 */
export function CityProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string>(DEFAULT_CITY_KEY);
  const [ready, setReady] = useState(false);
  const [hasChosen, setHasChosen] = useState(false);

  useEffect(() => {
    let active = true;
    getSelectedCityKey().then((stored) => {
      if (!active) return;
      if (stored) {
        setKey(getCity(stored).key);
        setHasChosen(true);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setCityKey = useCallback((next: string) => {
    const valid = getCity(next).key;
    setKey(valid);
    setHasChosen(true);
    setSelectedCityKey(valid);
  }, []);

  const value = useMemo(
    () => ({ city: getCity(key), ready, hasChosen, setCityKey }),
    [key, ready, hasChosen, setCityKey],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity va usato dentro <CityProvider>');
  return ctx;
}
