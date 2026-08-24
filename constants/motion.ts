import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';

import { Durations, Stagger } from '@/constants/theme';

/**
 * LE ANIMAZIONI DELL'APP, PRONTE E GIÀ TARATE.
 *
 * PERCHÉ ESISTE QUESTO FILE
 * La stessa riga — `.springify().damping(20).stiffness(180)` — era scritta a
 * mano in dieci file diversi, ognuno con numeri leggermente suoi. Nessuno
 * poteva sistemare il movimento dell'app: avrebbe dovuto trovarli tutti, e
 * chiunque ne avrebbe aggiunto un altro il giorno dopo. È la stessa classe di
 * errore del glossario (parole scritte a mano invece che prese da un posto
 * solo) e della formula dei crediti copiata in due punti.
 *
 * Da qui in avanti: si importa da qui, e il movimento si cambia in un posto.
 *
 * COSA È CAMBIATO E PERCHÉ
 * Segnalazione del collaudo: «le animazioni fanno davvero schifo, alcune
 * sembrano a rallentatore». Le molle sugli ingressi superavano il punto
 * d'arrivo e ci tornavano sopra — è la sensazione di "molleggiante" — e le
 * cascate arrivavano a 440 ms. Ora gli ingressi non usano molle: arrivano e si
 * fermano, in 180 ms.
 *
 * La molla resta solo dove il dito è ancora sullo schermo (`PressableScale`):
 * lì il rimbalzo è la risposta fisica al tocco, e ha senso.
 */

/** Ingresso normale: sale di poco e si ferma. Il caso da usare quasi sempre. */
export const entra = FadeInDown.duration(Durations.base);

/** Ingresso dall'alto verso il basso, per gli stati vuoti e i messaggi. */
export const entraDallAlto = FadeInUp.duration(Durations.base);

/**
 * Ingresso in lista, a cascata corta.
 * Si ferma al terzo elemento: oltre, l'attesa si sente e non aggiunge niente.
 */
export function entraInLista(index: number) {
  return FadeInDown.duration(Durations.base).delay(
    Math.min(index, Stagger.maxItems) * Stagger.step,
  );
}

/** Comparsa e scomparsa semplici: anteprime, veli, righe che cambiano. */
export const appare = FadeIn.duration(Durations.instant);
export const sparisce = FadeOut.duration(Durations.instant);

/** Il velo scuro dietro una finestra. */
export const velo = FadeIn.duration(Durations.instant);

/**
 * Finestra che si apre al centro. Senza molla: una finestra che rimbalza
 * sembra un giocattolo, e queste finestre chiedono cose serie (segnalare
 * qualcuno, cambiare città).
 */
export const apreFinestra = ZoomIn.duration(Durations.base);

/**
 * Il marchio che compare all'ingresso (accesso, registrazione). È l'unico
 * punto in cui un movimento serve a fare impressione invece che a spiegare,
 * e per questo può permettersi di durare un po' di più.
 */
export const entraMarchio = ZoomIn.duration(Durations.large);

/** Avviso che entra dal basso e se ne va. */
export const entraDalBasso = SlideInDown.duration(Durations.base);
export const esceInBasso = FadeOutDown.duration(Durations.instant);
