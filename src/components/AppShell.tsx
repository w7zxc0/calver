'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { longDateLabel } from '@/lib/date';
import { freshState } from '@/lib/seed';
import { fetchState, persistState } from '@/lib/storage';
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

const SAVED = 'Saved to the database.';
const SAVING = 'Saving…';
const FAILED = 'Save failed — check connection.';

export function AppShell() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>('dashboard');
  const [saveStatus, setSaveStatus] = useState(SAVED);
  const isFirstState = useRef(true);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setState(await fetchState());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not reach the database.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Persist on change, debounced so typing does not write on every keystroke.
  // The first state comes straight from the database, so it is not written back.
  useEffect(() => {
    if (!state) return;
    if (isFirstState.current) {
      isFirstState.current = false;
      return;
    }
    setSaveStatus(SAVING);

    const timer = setTimeout(() => {
      persistState(state)
        .then(() => setSaveStatus(SAVED))
        .catch(() => setSaveStatus(FAILED));
    }, 400);

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
        {loadError ? (
          <div className="loading">
            <div>Could not load your data.</div>
            <div style={{ color: 'var(--ink-faint)', fontSize: 12, margin: '8px 0 14px' }}>{loadError}</div>
            <button className="btn" type="button" onClick={() => void load()}>Try again</button>
          </div>
        ) : !state ? (
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
