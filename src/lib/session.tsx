import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getMyProfile, type Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type SessionState = {
  /** The signed-in user's session, or null when signed out. */
  session: Session | null;
  /** The signed-in user's profile (name, role, …). Null when signed out or if it failed to load. */
  profile: Profile | null;
  /** True until we know whether someone is signed in and, if so, have loaded their profile. */
  isLoading: boolean;
  /** Loads the profile again, e.g. after joining a group changes your overseer. */
  refreshProfile: () => void;
};

// Context lets any screen read the session without passing it down through
// every component as a prop. The provider below holds the value; screens read
// it with the useSession() hook.
const SessionContext = createContext<SessionState>({
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  // Remember whose profile we loaded, so a stale profile is never shown after
  // switching accounts.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null);
  // Bumping this number makes the profile effect below run again.
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // Supabase calls this right away with any saved session (INITIAL_SESSION),
    // then again on every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionChecked(true);
    });

    // Cleanup: stop listening if this provider is ever removed.
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Load the profile whenever a different user signs in. This is a separate
  // effect because Supabase advises against awaiting other Supabase calls
  // inside the onAuthStateChange callback.
  useEffect(() => {
    if (!userId) return;
    // If the user changes before the request finishes, `ignore` stops us
    // from saving a stale result.
    let ignore = false;
    getMyProfile(userId).then((profile) => {
      if (!ignore) setLoaded({ userId, profile });
    });
    return () => {
      ignore = true;
    };
  }, [userId, reloadCount]);

  const profileReady = userId !== null && loaded?.userId === userId;
  const value: SessionState = {
    session,
    profile: profileReady ? loaded.profile : null,
    isLoading: !sessionChecked || (userId !== null && !profileReady),
    refreshProfile: () => setReloadCount((count) => count + 1),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
