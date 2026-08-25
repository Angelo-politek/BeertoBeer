/**
 * CHE VERSIONE È QUESTA — e perché i numeri sono due.
 *
 * Un'app Expo aggiornata via OTA ha due cose che cambiano a ritmi diversi:
 *
 *   IL GUSCIO  — l'APK installato sul telefono. È `app.json.version`, oggi
 *                `1.1.0`. Cambia solo quando si costruisce e si distribuisce
 *                un APK nuovo, e le persone lo reinstallano a mano.
 *
 *   IL CODICE  — il bundle JavaScript, che arriva da solo con `eas update`.
 *                È quello che cambia quasi ogni volta, ed è quello che una
 *                persona vede cambiare.
 *
 * ⚠️ `app.json.version` NON È UN NUMERO DI VERSIONE: è la chiave del canale.
 *    `runtimeVersion.policy: "appVersion"` significa che il runtime È la
 *    versione, quindi cambiarla crea un canale nuovo e **tutti gli
 *    aggiornamenti successivi diventano invisibili ai telefoni già
 *    installati**. In silenzio: nessun errore, nessun avviso, semplicemente
 *    non arriva più niente. Si tocca solo insieme a un APK nuovo, sapendo che
 *    da quel momento chi non reinstalla resta fermo per sempre.
 *
 * Quindi il numero che le persone leggono è QUESTO, e vive qui.
 */

/**
 * 3.0.0-beta.1.
 *
 * Perché 3 e non 2.2: è la prima versione in cui la tesi della V3 si può
 * davvero usare — dire che sei fuori, farsi trovare, e ricevere un giro da
 * chi ti ha visto. Fino a ieri l'app sapeva mostrare solo domanda
 * insoddisfatta.
 *
 * Perché `beta.1` e non `3.0.0`: perché la V3 non è finita, e chiamarla finita
 * sarebbe la prima cosa non vera che questa app dice di sé. Mancano ancora la
 * casella unica dei messaggi, la riscrittura della voce, la reputazione fatta
 * di fatti al posto della media, e tutto l'auto-governo. Quando ci saranno,
 * questo numero diventa `3.0.0` e `app.json` lo raggiunge con un APK nuovo.
 */
export const VERSIONE = '3.0.0-beta.2';

/** Il nome per esteso, per i posti in cui si legge da solo. */
export const VERSIONE_ESTESA = `Beer to Beer ${VERSIONE}`;
