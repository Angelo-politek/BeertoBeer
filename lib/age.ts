import { INGRESSO } from '@/constants/testi';

/**
 * Utility per la data di nascita e il gate 18+.
 * Input dall'utente nel formato italiano GG/MM/AAAA.
 */

/** Converte "GG/MM/AAAA" in una Date valida, oppure null se non è una data reale. */
export function parseBirthdate(input: string): Date | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);
  // Verifica che la data esista davvero (es. 31/02 verrebbe normalizzata).
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!valid) return null;
  if (date > new Date()) return null; // niente date future

  return date;
}

/**
 * Età in anni compiuti a una certa data (default: oggi).
 *
 * ⚠️ `oggi` NON è un vezzo da test: senza, questa funzione leggeva sempre
 * `new Date()` e ignorava la data che `esaminaData` le passava. Il risultato
 * è che il caso di confine del gate 18+ — «il giorno prima del compleanno,
 * no» — non era davvero coperto: passava solo nelle giornate in cui la data
 * finta del test coincideva con quella vera del computer, e ha cominciato a
 * fallire da solo il giorno dopo essere stato scritto.
 *
 * Un test che dipende dall'orologio di chi lo esegue non protegge niente: dice
 * la verità un giorno su trecentosessantacinque.
 */
export function computeAge(birth: Date, oggi = new Date()): number {
  let age = oggi.getFullYear() - birth.getFullYear();
  const hadBirthday =
    oggi.getMonth() > birth.getMonth() ||
    (oggi.getMonth() === birth.getMonth() && oggi.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/** Formatta una Date come "AAAA-MM-GG" (formato che Postgres accetta come date). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Mette le barre mentre si scrive: "24121999" diventa "24/12/1999".
 *
 * Prima il campo era testo libero con l'istruzione "GG/MM/AAAA" nel
 * segnaposto: chi scriveva "24-12-1999" o "24 12 1999" si vedeva rifiutare
 * una data giusta, e chi scriveva "1999" non capiva perché non andasse.
 * Le barre le mette l'app, all'utente restano solo le cifre.
 */
export function formattaData(input: string): string {
  const cifre = input.replace(/[^0-9]/g, '').slice(0, 8);
  if (cifre.length <= 2) return cifre;
  if (cifre.length <= 4) return `${cifre.slice(0, 2)}/${cifre.slice(2)}`;
  return `${cifre.slice(0, 2)}/${cifre.slice(2, 4)}/${cifre.slice(4)}`;
}

/** Età minima per stare su Beer to Beer: si parla di alcolici. */
export const ETA_MINIMA = 18;

export type EsitoData =
  | { stato: 'incompleta' }
  | { stato: 'non-valida'; motivo: string }
  | { stato: 'troppo-giovane'; anni: number }
  | { stato: 'ok'; data: Date; anni: number };

/**
 * Che ne e' della data scritta finora. Serve a dare un riscontro MENTRE si
 * scrive invece che dopo aver premuto "Crea account": un errore che arriva
 * alla fine costringe a tornare indietro e a rileggere tutto il modulo.
 */
export function esaminaData(input: string, oggi = new Date()): EsitoData {
  const cifre = input.replace(/[^0-9]/g, '');
  if (cifre.length < 8) return { stato: 'incompleta' };

  const data = parseBirthdate(formattaData(input));
  if (!data) {
    // Il giorno o il mese impossibili sono l'errore piu' comune (31/02, 45/12).
    return { stato: 'non-valida', motivo: INGRESSO.registrazione.dataInesistente };
  }
  if (data > oggi) {
    return { stato: 'non-valida', motivo: INGRESSO.registrazione.dataNelFuturo };
  }
  const anni = computeAge(data, oggi);
  if (anni > 120) {
    return { stato: 'non-valida', motivo: INGRESSO.registrazione.annoSbagliato };
  }
  if (anni < ETA_MINIMA) return { stato: 'troppo-giovane', anni };
  return { stato: 'ok', data, anni };
}
