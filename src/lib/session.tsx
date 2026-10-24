import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type SessionState = {
  /** The signed-in user's session, or null when signed out. */
  session: Session | null;
  /** True until we've checked whether a saved session exists on the phone. */
  isLoading: boolean;
};

// Context lets any screen read the session without passing it down through
// every component as a prop. The provider below holds the value; screens read
// it with the useSession() hook.
const SessionContext = createContext<SessionState>({ session: null, isLoading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    // Supabase calls this right away with any saved session (INITIAL_SESSION),
    // then again on every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isLoading: false });
    });

    // Cleanup: stop listening if this provider is ever removed.
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
