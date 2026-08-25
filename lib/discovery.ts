import { motivoNonAgibile } from '@/lib/orders';

import type { BeerRequest, DiscoveryFilters, OrderNextAction } from '@/types';

function hourFromFascia(fascia?: string): number | null {
  if (!fascia) return null;
  const match = fascia.match(/(?:^|\s)(\d{1,2})(?::\d{2})?/);
  return match ? Number(match[1]) : null;
}

export function requestMatchesFilters(request: BeerRequest, filters: DiscoveryFilters): boolean {
  if (filters.vibeOnly && !request.vibeMode) return false;
  if (filters.maxDistanceKm != null && (request.distanzaKm == null || request.distanzaKm > filters.maxDistanceKm)) return false;
  if (filters.time !== 'all') {
    const hour = hourFromFascia(request.fascia);
    if (filters.time === 'now' && hour != null && Math.abs(hour - new Date().getHours()) > 2) return false;
    if (filters.time === 'tonight' && hour != null && hour < 18) return false;
  }
  return true;
}

/**
 * COME SI ORDINA UN ELENCO IN UN'APP CHE RIFIUTA IL RANKING.
 *
 * Qui c'era `smartScore`, che ordinava le richieste delle persone cosi':
 *
 *     ratingMedio * 4  -  distanza * 1.6  -  oreDiEta  +  (fascia ? 2 : 0)
 *
 * e nell'interfaccia si chiamava «Per te». Tre problemi, in ordine crescente
 * di gravita':
 *
 *  1. i pesi non li aveva scelti nessuno. 4, 1.6, 1, 2: nel file non c'era una
 *     riga che li giustificasse. Un algoritmo di cui nessuno sa spiegare i
 *     numeri e' arbitrario per definizione.
 *  2. «Per te» e' letteralmente la parola delle piattaforme che questo
 *     progetto dice di non essere.
 *  3. `ratingMedio * 4` era il termine dominante, e `rating_medio` parte da
 *     zero. Un nuovo iscritto partiva venti punti sotto: l'equivalente di
 *     dodici chilometri di distanza. In una beta a trenta persone, dove ogni
 *     nuovo arrivato e' meta' del valore dell'app, il criterio PREDEFINITO lo
 *     metteva sistematicamente in fondo. Non era una tensione filosofica: era
 *     un difetto misurabile.
 *
 * LA REGOLA CHE LO SOSTITUISCE, e va letta prima di «migliorare l'ordinamento»:
 *
 *     Un ordinamento e' accettabile quando la persona che lo subisce puo'
 *     capirlo in una frase.
 *
 * «Chi finisce prima» e' un orologio, non un giudizio: chi e' in cima puo'
 * sapere perche', e non si puo' ottimizzare senza dire una cosa vera —
 * dichiarare una finestra corta ti mette primo E finisce presto. La distanza
 * e' un fatto fisico. «Appena arrivati» e' l'ordine di inserimento.
 * Nessuno dei tre ha pesi da tarare, quindi nessuno puo' degradare in silenzio.
 */
export function sortDiscovery(requests: BeerRequest[], filters: DiscoveryFilters): BeerRequest[] {
  return [...requests].sort((a, b) => {
    if (filters.sort === 'distanza') return (a.distanzaKm ?? Infinity) - (b.distanzaKm ?? Infinity);
    if (filters.sort === 'recenti') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    // scadenza: chi finisce prima, prima. A parita', il piu' vicino.
    const fineA = a.scadeIl ? new Date(a.scadeIl).getTime() : Infinity;
    const fineB = b.scadeIl ? new Date(b.scadeIl).getTime() : Infinity;
    if (fineA !== fineB) return fineA - fineB;
    return (a.distanzaKm ?? Infinity) - (b.distanzaKm ?? Infinity);
  });
}

/**
 * Perche' questo giro compare qui — solo fatti, mai giudizi.
 *
 * Prima questa funzione restituiva anche «Persona affidabile» quando il rating
 * medio superava 4,5: cioe' l'app DICHIARAVA affidabile una persona sulla base
 * di una media, su ogni card del feed. Era smartScore con il numero limato
 * via, ed e' sparita insieme a lui.
 */
export function whyThisRequest(request: BeerRequest): string | null {
  if (request.distanzaKm != null && request.distanzaKm <= 1.5) return 'Molto vicino a te';
  if (request.fascia) return `Serve ${request.fascia.toLowerCase()}`;
  return null;
}

export function nextOrderAction(request: BeerRequest, myId?: string): OrderNextAction {
  if (request.stato === 'annullato') return { key: 'open', label: 'Giro annullato', priority: 0 };
  // Prima di chiedersi «a che punto siamo», chiedersi «si puo' ancora fare
  // qualcosa». Un giro fermo per sicurezza o tolto dal feed non ha una
  // prossima azione: il server rifiuta ogni transizione, e un pulsante che
  // fallisce con un'eccezione grezza e' peggio di nessun pulsante.
  const fermo = motivoNonAgibile(request);
  if (fermo) return { key: 'open', label: fermo, priority: 0 };
  const host = request.host.id === myId;
  const driver = request.driverId === myId;
  if (request.stato === 'richiesto') return host ? { key: 'wait', label: 'Aspetta chi porta', priority: 35 } : { key: 'accept', label: 'Puoi accettare', priority: 90 };
  if (request.stato === 'accettato') return driver ? { key: 'start', label: 'Parti quando sei pronto', priority: 100 } : { key: 'wait', label: 'Chi porta si sta organizzando', priority: 55 };
  if (request.stato === 'in_consegna') return driver ? { key: 'arrive', label: 'Segna il tuo arrivo', priority: 100 } : { key: 'wait', label: 'La birra è in arrivo', priority: 70 };
  if (request.stato === 'arrivato') return driver ? { key: 'verify', label: 'Inserisci il codice', priority: 110 } : { key: 'open', label: 'Comunica il codice', priority: 110 };
  if (request.stato === 'consegnato') {
    const confirmed = host ? request.hostConfermato : request.driverConfermato;
    return confirmed ? { key: 'wait', label: 'Attendi l’altra conferma', priority: 60 } : { key: 'confirm', label: 'Conferma lo scambio', priority: 105 };
  }
  return { key: 'review', label: 'Lascia un feedback', priority: 20 };
}
