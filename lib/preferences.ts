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


/**
 * LE NOVITA' DA MOSTRARE DOPO UN AGGIORNAMENTO.
 *
 * Segnalazione del collaudo: «ogni volta che arriva un aggiornamento deve
 * arrivare un messaggio in app in cui dice che e' stata aggiornata e quali
 * sono le novita'».
 *
 * Il vincolo tecnico che decide la forma della soluzione: Updates.reloadAsync()
 * riavvia l'app e distrugge tutto lo stato React. Non esiste nessun modo di
 * ricordarsi in memoria che si e' appena aggiornato — il ricordo va scritto su
 * disco PRIMA del riavvio e riletto al boot successivo. E' lo stesso problema
 * per cui esiste lib/onboarding-signal.ts, con una differenza: li' lo stato
 * sopravvive a un cambio di schermata, qui a un riavvio del processo.
 */
const NOVITA_KEY = 'btb:novitaDaMostrare';
const VERSIONE_VISTA_KEY = 'btb:ultimaVersioneVista';

export async function segnaAggiornamentoInArrivo(updateId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(NOVITA_KEY, updateId);
  } catch {
    // best-effort: se non si scrive, l'aggiornamento avviene lo stesso e
    // l'unica cosa che si perde e' il messaggio. Mai bloccare il riavvio.
  }
}

/** L'id dell'aggiornamento appena applicato, una volta sola. */
export async function ritiraAggiornamentoApplicato(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(NOVITA_KEY);
    if (v) await AsyncStorage.removeItem(NOVITA_KEY);
    return v;
  } catch {
    return null;
  }
}

/**
 * True solo se questa installazione ha gia' visto girare una versione
 * precedente. Serve a non presentare le novita' a chi ha appena installato
 * l'app: leggerebbe l'elenco delle correzioni di qualcosa che non ha mai usato.
 */
export async function haGiaVistoUnaVersione(versione: string): Promise<boolean> {
  try {
    const vista = await AsyncStorage.getItem(VERSIONE_VISTA_KEY);
    if (vista !== versione) await AsyncStorage.setItem(VERSIONE_VISTA_KEY, versione);
    return vista != null;
  } catch {
    return false;
  }
}
