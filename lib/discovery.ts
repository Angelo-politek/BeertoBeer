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

export function smartScore(request: BeerRequest): number {
  const ageHours = Math.max(0, (Date.now() - new Date(request.createdAt).getTime()) / 3_600_000);
  const distance = request.distanzaKm ?? 20;
  return (request.host.ratingMedio * 4) - (distance * 1.6) - ageHours + (request.fascia ? 2 : 0);
}

export function sortDiscovery(requests: BeerRequest[], filters: DiscoveryFilters): BeerRequest[] {
  return [...requests].sort((a, b) => {
    if (filters.sort === 'distance') return (a.distanzaKm ?? Infinity) - (b.distanzaKm ?? Infinity);
    if (filters.sort === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return smartScore(b) - smartScore(a);
  });
}

export function whyThisRequest(request: BeerRequest): string {
  if (request.distanzaKm != null && request.distanzaKm <= 1.5) return 'Molto vicino a te';
  if (request.host.ratingMedio >= 4.5) return 'Persona affidabile';
  if (request.fascia) return `Disponibile ${request.fascia.toLowerCase()}`;
  return 'Pubblicato di recente';
}

export function nextOrderAction(request: BeerRequest, myId?: string): OrderNextAction {
  if (request.stato === 'annullato') return { key: 'open', label: 'Giro annullato', priority: 0 };
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
