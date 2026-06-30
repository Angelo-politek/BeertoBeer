/**
 * LAYER DATI — l'unico punto da cui le schermate leggono i dati.
 *
 * Oggi queste funzioni restituiscono i dati finti di `data/mock.ts`.
 * In Fase 1 si riscrive SOLO questo file con le chiamate a Supabase
 * (probabilmente rendendo le funzioni `async`): la UI non cambia.
 */

import { mockCurrentUser, mockRequests, mockTransactions, mockUsers } from '@/data/mock';
import type { BeerRequest, CreditTransaction, User } from '@/types';

/** Tutte le richieste birra attive nel feed. */
export function getRequests(): BeerRequest[] {
  return mockRequests;
}

/** Una singola richiesta per id (undefined se non esiste). */
export function getRequestById(id: string): BeerRequest | undefined {
  return mockRequests.find((r) => r.id === id);
}

/** L'utente corrente ("tu"). */
export function getCurrentUser(): User {
  return mockCurrentUser;
}

/** Un utente qualsiasi per id (undefined se non esiste). */
export function getUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id);
}

/** Saldo crediti dell'utente corrente. */
export function getCreditBalance(): number {
  return mockCurrentUser.creditiSaldo;
}

/** Storico movimenti crediti dell'utente corrente. */
export function getTransactions(): CreditTransaction[] {
  return mockTransactions;
}
