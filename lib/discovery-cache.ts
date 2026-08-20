import { getRequests, getShops, type Shop } from '@/data/api';
import type { BeerRequest } from '@/types';

const TTL_MS = 30_000;
type Entry<T> = { value: T; at: number; pending?: Promise<T> };
const requestCache = new Map<string, Entry<BeerRequest[]>>();
const shopCache = new Map<string, Entry<Shop[]>>();

async function cached<T>(cache: Map<string, Entry<T>>, key: string, loader: () => Promise<T>, force = false): Promise<T> {
  const current = cache.get(key);
  if (!force && current && Date.now() - current.at < TTL_MS) return current.value;
  if (!force && current?.pending) return current.pending;
  const pending = loader().then((value) => { cache.set(key, { value, at: Date.now() }); return value; }).catch((error) => { if (current) cache.set(key, current); else cache.delete(key); throw error; });
  cache.set(key, { value: current?.value as T, at: current?.at ?? 0, pending });
  return pending;
}

export function getDiscoveryRequests(city: string, force = false) { return cached(requestCache, city, () => getRequests(city), force); }
export function getDiscoveryShops(city: string, force = false) { return cached(shopCache, city, () => getShops(city), force); }
export function invalidateDiscovery(city: string) { requestCache.delete(city); shopCache.delete(city); }
