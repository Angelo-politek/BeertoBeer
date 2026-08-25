/**
 * DUE SEGNAPOSTO NELLO STESSO PUNTO: SE NE VEDE UNO SOLO.
 *
 * Non è un difetto della mappa, è una conseguenza diretta della privacy.
 * Le viste pubbliche arrotondano le coordinate a due decimali — circa un
 * chilometro — perché non si pubblica il punto esatto da cui una persona ha
 * detto «sono qui». Ma arrotondare significa che **tutti quelli nello stesso
 * chilometro quadrato ricevono esattamente le stesse coordinate**: i marker
 * finiscono uno sopra l'altro, e si vede solo quello disegnato per ultimo.
 *
 * Con tre tester nello stesso quartiere succede sempre. Con trenta persone in
 * città sarebbe stato il comportamento normale.
 *
 * COSA FA QUESTA FUNZIONE. Quando più elementi cadono sullo stesso punto, li
 * dispone su un cerchietto attorno a quel punto. Non aggiunge precisione — il
 * centro resta quello arrotondato, e lo scostamento è più piccolo
 * dell'arrotondamento stesso — serve solo a renderli tutti visibili.
 *
 * L'ordine è deterministico: la stessa lista dà sempre la stessa disposizione,
 * quindi i marker non ballano a ogni ridisegno.
 */

/** Circa 60 metri: ben dentro il chilometro di incertezza già introdotto. */
const RAGGIO_GRADI = 0.00055;

export type Punto = { lat: number; lng: number };

export function sparpagliaSovrapposti<T extends Punto>(items: T[]): (T & Punto)[] {
  const gruppi = new Map<string, T[]>();
  for (const item of items) {
    const chiave = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
    const g = gruppi.get(chiave);
    if (g) g.push(item);
    else gruppi.set(chiave, [item]);
  }

  const fuori: (T & Punto)[] = [];
  for (const gruppo of gruppi.values()) {
    if (gruppo.length === 1) {
      fuori.push(gruppo[0]);
      continue;
    }
    // Più di uno nello stesso punto: si aprono a ventaglio.
    gruppo.forEach((item, i) => {
      const angolo = (2 * Math.PI * i) / gruppo.length;
      // La correzione sul coseno tiene il cerchio tondo anche alle nostre
      // latitudini, dove un grado di longitudine è più corto di uno di
      // latitudine.
      const correzione = Math.cos((item.lat * Math.PI) / 180) || 1;
      fuori.push({
        ...item,
        lat: item.lat + RAGGIO_GRADI * Math.sin(angolo),
        lng: item.lng + (RAGGIO_GRADI * Math.cos(angolo)) / correzione,
      });
    });
  }
  return fuori;
}
