import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from './lib/supabase';
import { GroupsPage } from './pages/GroupsPage';
import { PeoplePage } from './pages/PeoplePage';
import { SignInPage } from './pages/SignInPage';

const PAGES = { people: 'People & roles', groups: 'Groups' } as const;
type Page = keyof typeof PAGES;

/** The page lives in the URL hash (#people, #groups) so refreshing keeps your place. */
function pageFromHash(): Page {
  const hash = window.location.hash.slice(1);
  return hash in PAGES ? (hash as Page) : 'people';
}

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState<Page>(pageFromHash);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const userId = session?.user.id;

  // Check the signed-in person's role. This only decides what to show:
  // the database refuses admin actions from non-admins either way.
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!ignore) setIsAdmin(data?.role === 'admin');
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (session === undefined) return null;
  if (session === null) return <SignInPage />;
  if (isAdmin === undefined) return <p className="centered muted">Loading…</p>;

  if (!isAdmin) {
    return (
      <main className="centered narrow">
        <h1>Admins only</h1>
        <p className="muted">
          This site is for Abide admins. Leaders and overseers use the Abide app on their phone.
        </p>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <div className="layout">
      <header className="topbar">
        <strong className="brand">Abide Admin</strong>
        <nav>
          {(Object.keys(PAGES) as Page[]).map((key) => (
            <a key={key} href={`#${key}`} className={key === page ? 'active' : undefined}>
              {PAGES[key]}
            </a>
          ))}
        </nav>
        <span className="muted email">{session.user.email}</span>
        <button className="secondary small" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>
      <main className="content">
        {page === 'people' && <PeoplePage currentUserId={session.user.id} />}
        {page === 'groups' && <GroupsPage />}
      </main>
    </div>
  );
}
