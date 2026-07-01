import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  /** La sessione Supabase corrente, oppure null se non si è loggati. */
  session: Session | null;
  /** true finché non sappiamo se esiste già una sessione salvata. */
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

/**
 * Tiene lo stato di autenticazione per tutta l'app.
 * - All'avvio legge la sessione eventualmente salvata su AsyncStorage (getSession).
 * - Poi resta in ascolto dei cambi di stato (login, logout, refresh token).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sessione iniziale (riavvio dell'app → resto loggato se c'era una sessione).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Aggiornamenti successivi: login, logout, refresh del token.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Hook per leggere la sessione corrente da qualsiasi schermata. */
export function useSession() {
  return useContext(SessionContext);
}
