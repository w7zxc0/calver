'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { longDateLabel } from '@/lib/date';
import { freshState, migrate } from '@/lib/seed';
import { readRaw, writeRaw } from '@/lib/storage';
import type { AppState, ViewId } from '@/lib/types';
import { AppProvider } from '@/components/AppProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ManageView } from '@/components/manage/ManageView';
import { ProjectsView } from '@/components/projects/ProjectsView';

const TABS: { id: ViewId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'manage', label: 'Manage' },
];

const SAVED = 'Saved locally to your account.';
const SAVING = 'Saving…';
const FAILED = 'Save failed — check connection.';

export function AppShell() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<ViewId>('dashboard');
  const [saveStatus, setSaveStatus] = useState(SAVED);
  const hasLoaded = useRef(false);

  // Load once on mount: stored data if there is any, otherwise the seed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: AppState;
      try {
        const raw = await readRaw();
        loaded = raw ? migrate(JSON.parse(raw)) : freshState();
      } catch {
        loaded = freshState();
      }
      if (!cancelled) setState(loaded);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist on change, debounced so typing does not write on every keystroke.
  useEffect(() => {
    if (!state) return;
    const first = !hasLoaded.current;
    hasLoaded.current = true;
    if (!first) setSaveStatus(SAVING);

    const timer = setTimeout(() => {
      writeRaw(JSON.stringify(state))
        .then(() => setSaveStatus(SAVED))
        .catch(() => setSaveStatus(FAILED));
    }, first ? 0 : 400);

    return () => clearTimeout(timer);
  }, [state]);

  const handleChange = useCallback((next: AppState) => setState(next), []);

  const reset = () => {
    if (!window.confirm('Reset all data back to the starting seed? This cannot be undone.')) return;
    setState(freshState());
  };

  return (
    <div className="shell">
      <header className="top">
        <h1>Calver - Management</h1>
        <div className="date mono">{state ? longDateLabel() : ''}</div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={view === t.id ? 'active' : undefined}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div id="app">
        {!state ? (
          <div className="loading">Loading…</div>
        ) : (
          <AppProvider state={state} onChange={handleChange}>
            {view === 'dashboard' && <Dashboard />}
            {view === 'projects' && <ProjectsView />}
            {view === 'manage' && <ManageView />}
          </AppProvider>
        )}
      </div>

      <footer className="foot">
        <span>{saveStatus}</span>
        <button type="button" onClick={reset}>Reset all data</button>
      </footer>
    </div>
  );
}
