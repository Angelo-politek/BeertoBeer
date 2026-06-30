/**
 * DATI FINTI — unico modulo, facilmente sostituibile.
 *
 * In Fase 0 le schermate leggono questi dati (tramite `data/api.ts`).
 * In Fase 1 NON si tocca questo file: si riscrive solo `data/api.ts` per
 * leggere da Supabase. Le schermate restano identiche.
 */

import type { BeerRequest, CreditTransaction, User } from '@/types';

/** L'utente "tu" (per Wallet e Profilo). */
export const mockCurrentUser: User = {
  id: 'u-me',
  nome: 'Luca Bianchi',
  eta: 24,
  bio: 'Studente di ingegneria, amante delle birre artigianali e delle serate tranquille.',
  ratingMedio: 4.8,
  scambiCompletati: 7,
  creditiSaldo: 42,
  preferenzeBirra: 'IPA, birre artigianali, lager leggere',
};

/** Host che hanno pubblicato richieste nel feed. */
const giulia: User = {
  id: 'u-giulia',
  nome: 'Giulia M.',
  eta: 23,
  bio: 'Fuori sede a Torino, sempre a caccia di compagnia per un aperitivo.',
  ratingMedio: 4.9,
  scambiCompletati: 12,
  creditiSaldo: 30,
};

const marco: User = {
  id: 'u-marco',
  nome: 'Marco T.',
  eta: 27,
  bio: 'Lavoro da casa, ogni tanto serve rifornimento.',
  ratingMedio: 4.5,
  scambiCompletati: 5,
  creditiSaldo: 18,
};

const sofia: User = {
  id: 'u-sofia',
  nome: 'Sofia R.',
  eta: 22,
  bio: 'Adoro le birre belghe e parlare con gente nuova.',
  ratingMedio: 5.0,
  scambiCompletati: 9,
  creditiSaldo: 25,
};

const davide: User = {
  id: 'u-davide',
  nome: 'Davide P.',
  eta: 29,
  bio: 'Serata film con gli amici, mancano le birre.',
  ratingMedio: 4.2,
  scambiCompletati: 3,
  creditiSaldo: 12,
};

const chiara: User = {
  id: 'u-chiara',
  nome: 'Chiara V.',
  eta: 25,
  bio: 'Vicina di zona, scambio veloce e due chiacchiere.',
  ratingMedio: 4.7,
  scambiCompletati: 8,
  creditiSaldo: 21,
};

/** Le richieste birra attive nel feed. */
export const mockRequests: BeerRequest[] = [
  {
    id: 'r-1',
    host: chiara,
    birre: [{ nome: 'Forst', quantita: 3 }],
    indirizzo: 'Via Sant’Ottavio 12, Torino',
    distanzaKm: 0.3,
    stato: 'richiesto',
    vibeMode: true,
    creditiOfferti: 5,
    createdAt: '2026-06-30T18:40:00Z',
  },
  {
    id: 'r-2',
    host: giulia,
    birre: [{ nome: 'Ichnusa', quantita: 6 }],
    indirizzo: 'Corso Vittorio Emanuele II 88, Torino',
    distanzaKm: 0.4,
    stato: 'richiesto',
    vibeMode: true,
    creditiOfferti: 8,
    createdAt: '2026-06-30T18:25:00Z',
  },
  {
    id: 'r-3',
    host: sofia,
    birre: [{ nome: 'Baladin Nazionale', quantita: 4 }],
    indirizzo: 'Via Po 24, Torino',
    distanzaKm: 0.8,
    stato: 'richiesto',
    vibeMode: true,
    creditiOfferti: 10,
    createdAt: '2026-06-30T18:10:00Z',
  },
  {
    id: 'r-4',
    host: marco,
    birre: [
      { nome: 'Peroni', quantita: 12 },
      { nome: 'Nastro Azzurro', quantita: 4 },
    ],
    indirizzo: 'Via Nizza 150, Torino',
    distanzaKm: 1.2,
    stato: 'richiesto',
    vibeMode: false,
    creditiOfferti: 15,
    createdAt: '2026-06-30T17:55:00Z',
  },
  {
    id: 'r-5',
    host: davide,
    birre: [
      { nome: 'Moretti', quantita: 6 },
      { nome: 'Menabrea', quantita: 6 },
    ],
    indirizzo: 'Corso Francia 210, Torino',
    distanzaKm: 2.1,
    stato: 'richiesto',
    vibeMode: false,
    creditiOfferti: 12,
    createdAt: '2026-06-30T17:30:00Z',
  },
];

/** Storico movimenti crediti dell'utente corrente (per il Wallet). */
export const mockTransactions: CreditTransaction[] = [
  {
    id: 't-1',
    descrizione: 'Consegna a Sofia R.',
    importo: 10,
    tipo: 'entrata',
    data: '2026-06-29T21:15:00Z',
  },
  {
    id: 't-2',
    descrizione: 'Richiesta birre — Ichnusa x6',
    importo: 8,
    tipo: 'uscita',
    data: '2026-06-28T20:05:00Z',
  },
  {
    id: 't-3',
    descrizione: 'Consegna a Davide P.',
    importo: 12,
    tipo: 'entrata',
    data: '2026-06-27T22:40:00Z',
  },
  {
    id: 't-4',
    descrizione: 'Richiesta birre — Peroni x12',
    importo: 15,
    tipo: 'uscita',
    data: '2026-06-25T19:30:00Z',
  },
  {
    id: 't-5',
    descrizione: 'Consegna a Chiara V.',
    importo: 5,
    tipo: 'entrata',
    data: '2026-06-24T20:50:00Z',
  },
];

/** Tutti gli utenti noti (per aprire i profili altrui dal dettaglio). */
export const mockUsers: User[] = [
  mockCurrentUser,
  giulia,
  marco,
  sofia,
  davide,
  chiara,
];
