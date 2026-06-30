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

/** Età in anni compiuti alla data odierna. */
export function computeAge(birth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
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
