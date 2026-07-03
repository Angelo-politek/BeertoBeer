import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Preferenze locali dell'app (AsyncStorage). Best-effort: in caso di errore
 * di lettura/scrittura si degrada ai default senza propagare eccezioni.
 */

const SELECTED_CITY_KEY = 'btb:selectedCity';

export async function getSelectedCityKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SELECTED_CITY_KEY);
  } catch {
    return null;
  }
}

export async function setSelectedCityKey(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_CITY_KEY, key);
  } catch {
    // best-effort: la selezione vale comunque per la sessione corrente
  }
}
