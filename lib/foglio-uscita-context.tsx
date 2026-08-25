import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Uscita } from '@/types';

/**
 * IL FOGLIO PER DIRE CHE SEI FUORI, E LO STATO DI CHI LO E' GIA'.
 *
 * Perche' un context e non una schermata: la tab centrale NON e' una route.
 * Registrarla come schermata lascerebbe in giro una rotta fantasma che un deep
 * link o un router.push possono aprire mostrando il vuoto — e con
 * `typedRoutes` acceso comparirebbe anche nell'autocompletamento.
 *
 * Il provider sta SOPRA <Tabs>, cosi' il foglio si disegna sopra la barra e
 * puo' essere aperto anche da altrove: dallo stato vuoto della home, dal
 * marker di un negozio sulla mappa, da una notifica.
 */
type Valore = {
  aperto: boolean;
  /** L'uscita aperta a mio nome, se ce n'e' una. Serve alla tab, che cambia. */
  mia: Uscita | null;
  apri: (precompila?: Precompilazione) => void;
  chiudi: () => void;
  /** Chiamata dal foglio dopo aver aperto o chiuso un'uscita. */
  aggiorna: (uscita: Uscita | null) => void;
  precompilazione: Precompilazione | null;
};

/**
 * Cosa sa gia' chi apre il foglio. Toccando «Passo di qui» dal marker di un
 * minimarket, la forma e il punto sono gia' decisi: restano zero campi da
 * compilare, e dichiarare costa un tocco.
 */
export type Precompilazione = {
  tipo?: Uscita['tipo'];
  nota?: string;
  lat?: number;
  lng?: number;
  zona?: string;
};

const Ctx = createContext<Valore | null>(null);

export function FoglioUscitaProvider({ children }: { children: ReactNode }) {
  const [aperto, setAperto] = useState(false);
  const [mia, setMia] = useState<Uscita | null>(null);
  const [precompilazione, setPrecompilazione] = useState<Precompilazione | null>(null);

  const apri = useCallback((p?: Precompilazione) => {
    setPrecompilazione(p ?? null);
    setAperto(true);
  }, []);

  const chiudi = useCallback(() => {
    setAperto(false);
    setPrecompilazione(null);
  }, []);

  const valore = useMemo<Valore>(
    () => ({ aperto, mia, apri, chiudi, aggiorna: setMia, precompilazione }),
    [aperto, mia, apri, chiudi, precompilazione],
  );

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}

export function useFoglioUscita(): Valore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFoglioUscita va usato dentro FoglioUscitaProvider');
  return v;
}
