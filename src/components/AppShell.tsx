'use client';

import { useEffect, useState } from 'react';
import { fetchMe } from '@/lib/api';
import type { AuthUser } from '@/lib/types';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Workbench } from '@/components/Workbench';

type Session = AuthUser | null;

/** Decides between the sign-in screen and the workbench. */
export function AppShell() {
  const [session, setSession] = useState<Session>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(({ user }) => { if (!cancelled) setSession(user); })
      .catch(() => { if (!cancelled) setSession(null); })
      .finally(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, []);

  if (!checked) {
    return <div className="boot">Loading…</div>;
  }

  if (!session) {
    return <AuthScreen onSignedIn={setSession} />;
  }

  return <Workbench user={session} onSignedOut={() => setSession(null)} />;
}
