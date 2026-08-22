import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { savePushToken } from '@/data/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Esito della registrazione alle notifiche.
 *
 * Prima questa funzione restituiva `null` per motivi diversissimi fra loro
 * (permesso negato, configurazione mancante, rete giù) e chi la chiamava non
 * poteva distinguerli: il risultato era che un utente restava senza notifiche
 * senza che nessuno — lui o noi — lo venisse mai a sapere. Per una beta che
 * vive di notifiche è il guasto più costoso possibile.
 */
export type PushRegistration =
  | { ok: true; token: string }
  /** L'utente ha detto no: è una sua scelta, non un errore da segnalare. */
  | { ok: false; motivo: 'permesso-negato' }
  /** Manca l'id progetto EAS: errore di configurazione della build. */
  | { ok: false; motivo: 'configurazione' }
  /** Rete, servizio Expo o salvataggio del token: vale la pena dirlo. */
  | { ok: false; motivo: 'errore'; dettaglio?: string };

export async function registerForPushNotifications(): Promise<PushRegistration> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messaggi',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== 'granted') return { ok: false, motivo: 'permesso-negato' };

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return { ok: false, motivo: 'configurazione' };

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await savePushToken(token, Platform.OS);
    return { ok: true, token };
  } catch (e) {
    return { ok: false, motivo: 'errore', dettaglio: (e as { message?: string })?.message };
  }
}
