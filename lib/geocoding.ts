import type { City } from '@/lib/cities';
import type { Coords } from '@/lib/location';

/**
 * Ricerca indirizzi via Nominatim (OpenStreetMap): gratuito, senza chiave e
 * senza carta di credito. In cambio la loro usage policy chiede due cose che
 * qui vanno rispettate alla lettera, perché il prezzo del contrario è il blocco
 * dell'IP — cioè nessuno che riesce più a pubblicare un giro:
 *
 *   1. un User-Agent che identifichi l'applicazione E un contatto;
 *   2. non più di una richiesta al secondo.
 *
 * Con quattro amici non succedeva niente; con cinquanta persone che cercano un
 * indirizzo il sabato sera, succede.
 */
const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'BeerToBeer/1.0 (+https://github.com/Angelo-politek/BeertoBeer)',
};

/** Distanza minima fra due chiamate. 1.1s per stare larghi sul limite di 1/s. */
const MIN_INTERVAL_MS = 1100;

let lastCallAt = 0;
let coda: Promise<unknown> = Promise.resolve();

/**
 * Accoda le chiamate e le distanzia. Serializzare è voluto: due richieste
 * partite insieme violerebbero il limite anche rispettando ognuna il proprio
 * ritardo.
 */
function conLimite<T>(fn: () => Promise<T>): Promise<T> {
  const turno = coda.then(async () => {
    const attesa = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (attesa > 0) await new Promise((resolve) => setTimeout(resolve, attesa));
    lastCallAt = Date.now();
  });
  coda = turno.catch(() => undefined);
  return turno.then(fn);
}

/**
 * Esito della ricerca. Prima "indirizzo inesistente" e "servizio irraggiungibile"
 * tornavano entrambi `null`: all'utente veniva detto che il suo indirizzo non
 * esiste anche quando il problema era la rete o un blocco per troppe richieste.
 * Distinguerli permette di dire la verità.
 */
export type GeocodeResult =
  | { ok: true; coords: Coords }
  | { ok: false; motivo: 'non-trovato' }
  | { ok: false; motivo: 'servizio' }
  /**
   * L'indirizzo esiste, ma è in un altro comune. `comune` è il nome trovato,
   * così si può dire «quello è a Moncalieri» invece del generico «fuori città».
   *
   * Serve perché il controllo per raggio non basta: dal centro di Torino,
   * Moncalieri e Collegno stanno alla stessa distanza dei quartieri più
   * esterni di Torino stessa. Un cerchio non li può separare — il nome del
   * comune sì, e il geocoder ce l'ha già.
   */
  | { ok: false; motivo: 'altra-citta'; comune: string };

/** Bounding box `left,top,right,bottom` (lng/lat) attorno al centro città. */
function cityViewbox(city: City): string {
  const dLat = city.radiusKm / 111;
  const dLng = city.radiusKm / (111 * Math.cos((city.center.lat * Math.PI) / 180));
  const left = city.center.lng - dLng;
  const right = city.center.lng + dLng;
  const top = city.center.lat + dLat;
  const bottom = city.center.lat - dLat;
  return `${left},${top},${right},${bottom}`;
}

/**
 * Indirizzo → coordinate. Se viene passata una città la ricerca è VINCOLATA
 * alla sua bounding box (viewbox + bounded=1): "Via Roma" trova quella della
 * città selezionata, non un'omonima a 300 km.
 */
export async function geocodeAddress(address: string, city?: City): Promise<GeocodeResult> {
  const q = address.trim();
  if (!q) return { ok: false, motivo: 'non-trovato' };

  const query = city ? `${q}, ${city.label}` : q;
  let url =
    'https://nominatim.openstreetmap.org/search' +
    // addressdetails=1 costa zero (stessa richiesta) e restituisce il comune:
    // è l'unico modo preciso di sapere che un indirizzo è in provincia.
    // accept-language=it è obbligatorio, non cosmetico: senza, Nominatim può
    // rispondere "Turin" e il confronto con "Torino" fallirebbe, rifiutando
    // indirizzi validi.
    `?format=json&limit=1&addressdetails=1&accept-language=it&q=${encodeURIComponent(query)}`;
  if (city) {
    url += `&viewbox=${cityViewbox(city)}&bounded=1`;
  }

  try {
    const res = await conLimite(() => fetch(url, { headers: NOMINATIM_HEADERS }));
    // 429 = troppe richieste, 403 = bloccati: è un problema nostro, non dell'indirizzo.
    if (!res.ok) return { ok: false, motivo: 'servizio' };
    const data = (await res.json()) as { lat: string; lon: string; address?: Localita }[];
    if (!Array.isArray(data) || data.length === 0) return { ok: false, motivo: 'non-trovato' };

    const trovato = data[0];
    const comune = nomeComune(trovato.address);
    if (city && comune && !stessoComune(comune, city.label)) {
      return { ok: false, motivo: 'altra-citta', comune };
    }
    return { ok: true, coords: { lat: parseFloat(trovato.lat), lng: parseFloat(trovato.lon) } };
  } catch {
    return { ok: false, motivo: 'servizio' };
  }
}

export type Localita = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
};

/**
 * Il comune, se Nominatim lo dichiara. `suburb` è escluso di proposito: è il
 * quartiere, e per un indirizzo di Torino direbbe "San Salvario", che
 * verrebbe scambiato per un altro comune.
 */
export function nomeComune(a?: Localita): string | null {
  return a?.city || a?.town || a?.village || a?.municipality || null;
}

/**
 * Confronto fra nomi di comune: maiuscole, accenti e spazi non devono contare.
 * L'intervallo \u0300-\u036f sono i segni diacritici che NFD separa dalla
 * lettera: scritto come sequenza di escape e non come carattere grezzo, cosi'
 * resta leggibile e non dipende da come il file viene codificato.
 */
export function stessoComune(a: string, b: string): boolean {
  const normalizza = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  return normalizza(a) === normalizza(b);
}

type ReverseResult = {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

/**
 * Coordinate → indirizzo leggibile e breve ("Via Po 12, Torino"). Qui `null`
 * va benissimo: se la via non si ricava, il punto di consegna resta comunque
 * valido e l'utente completa a mano.
 */
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=json&addressdetails=1&lat=${coords.lat}&lon=${coords.lng}`;

  try {
    const res = await conLimite(() => fetch(url, { headers: NOMINATIM_HEADERS }));
    if (!res.ok) return null;
    const data = (await res.json()) as ReverseResult;
    const a = data.address;
    if (a?.road) {
      const via = a.house_number ? `${a.road} ${a.house_number}` : a.road;
      const luogo = a.suburb || a.city || a.town || a.village;
      return luogo ? `${via}, ${luogo}` : via;
    }
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

/**
 * SOLO IL QUARTIERE. Mai la via, mai il numero civico.
 *
 * `reverseGeocode` restituisce «Via Po 12, Torino» — ed è giusto così: serve a
 * chi sta scrivendo l'indirizzo DI CONSEGNA di un giro, che vedrà solo chi ha
 * accettato.
 *
 * Un'uscita è un'altra cosa. Quando una persona dice «sono fuori», quella riga
 * la legge chiunque in città. Passare lì dentro il risultato di
 * `reverseGeocode` significa pubblicare la via e il numero civico di qualcuno
 * a tutta la città — è successo, ed è la ragione per cui questa funzione
 * esiste separata invece di essere un parametro dell'altra.
 *
 * Qui si prende `suburb` (il quartiere: «San Salvario») e, se manca, il
 * comune. Se Nominatim non dà né l'uno né l'altro si torna `null`: meglio
 * nessuna zona che una zona troppo precisa.
 */
export async function zonaDaCoordinate(coords: Coords): Promise<string | null> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    // zoom=14 chiede a Nominatim il livello «quartiere»: già così non
    // restituisce la via. La selezione qui sotto è la seconda difesa.
    `?format=json&addressdetails=1&zoom=14&lat=${coords.lat}&lon=${coords.lng}`;

  try {
    const res = await conLimite(() => fetch(url, { headers: NOMINATIM_HEADERS }));
    if (!res.ok) return null;
    const data = (await res.json()) as ReverseResult;
    const a = data.address;
    // NB: `road` e `house_number` non si leggono nemmeno.
    return a?.suburb || a?.city || a?.town || a?.village || null;
  } catch {
    return null;
  }
}

/**
 * Terza difesa: una zona non è mai un indirizzo.
 *
 * Vale anche per quello che una persona scrive a mano, e per le righe che sono
 * già nel database. Se contiene una cifra o comincia con una parola da
 * toponimo stradale, non è un quartiere.
 */
const PAROLE_DI_STRADA =
  /^\s*(via|viale|v\.le|corso|c\.so|piazza|p\.zza|piazzale|largo|strada|vicolo|lungo|borgo|salita|circonvallazione)\b/i;

export function zonaAmmessa(zona: string | null | undefined): boolean {
  if (!zona) return false;
  const z = zona.trim();
  if (z.length < 2 || z.length > 60) return false;
  if (/\d/.test(z)) return false;
  if (PAROLE_DI_STRADA.test(z)) return false;
  return true;
}
