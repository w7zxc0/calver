'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ApiError, fetchSystemState, saveSystemState } from '@/lib/api';
import { longDateLabel } from '@/lib/date';
import type { AppState, SystemRole, SystemSummary, Theme, ViewId } from '@/lib/types';
import { AppProvider } from '@/components/AppProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ManageView } from '@/components/manage/ManageView';
import { ProjectsView } from '@/components/projects/ProjectsView';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

const SAVED = 'Saved';
const SAVING = 'Saving…';
const FAILED = 'Save failed — check connection.';
const SYNCED = 'Updated from another device';

/** How often a shared board checks whether someone else has changed it. */
const POLL_MS = 12_000;

interface Props {
  system: SystemSummary;
  view: ViewId;
  onRename: (id: string) => void;
  onToggleMenu: () => void;
}

export function SystemBoard({ system, view, onRename, onToggleMenu }: Props) {
  const [state, setState] = useState<AppState | null>(null);
  const [role, setRole] = useState<SystemRole>('editor');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState(SAVED);

  // Everything the polling loop needs to decide whether a remote copy is safe
  // to take, without re-subscribing on every keystroke.
  const updatedAtRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const skipSaveRef = useRef(true);

  const load = useCallback(async () => {
    setLoadError(null);
    setState(null);
    skipSaveRef.current = true;
    dirtyRef.current = false;
    try {
      const res = await fetchSystemState(system.id);
      updatedAtRef.current = res.updatedAt;
      setRole(res.role);
      setState(res.state);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not reach the database.');
    }
  }, [system.id]);

  useEffect(() => { void load(); }, [load]);

  // Persist on change, debounced so typing does not write on every keystroke.
  useEffect(() => {
    if (!state) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveStatus(SAVING);

    const timer = setTimeout(() => {
      saveSystemState(system.id, state)
        .then((res) => {
          updatedAtRef.current = res.updatedAt;
          dirtyRef.current = false;
          setSaveStatus(SAVED);
        })
        .catch(() => setSaveStatus(FAILED));
    }, 400);

    return () => clearTimeout(timer);
  }, [state, system.id]);

  // A shared system can change under you. Take the remote copy only when there
  // is nothing unsaved locally, so an edit in progress is never overwritten.
  const loaded = state !== null;
  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(() => {
      if (dirtyRef.current || document.hidden) return;
      void fetchSystemState(system.id)
        .then((res) => {
          if (dirtyRef.current) return;
          if (res.updatedAt && res.updatedAt !== updatedAtRef.current) {
            updatedAtRef.current = res.updatedAt;
            skipSaveRef.current = true;
            setState(res.state);
            setSaveStatus(SYNCED);
          }
        })
        .catch(() => {
          // A failed poll is not worth surfacing; the next one may succeed.
        });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loaded, system.id]);

  const handleChange = useCallback((next: AppState) => setState(next), []);

  if (loadError) {
    return (
      <div className="loading">
        <div>Could not load this system.</div>
        <div style={{ color: 'var(--ink-faint)', fontSize: 12, margin: '8px 0 14px' }}>{loadError}</div>
        <button className="btn" type="button" onClick={() => void load()}>Try again</button>
      </div>
    );
  }

  if (!state) return <div className="loading">Loading…</div>;

  return (
    <AppProvider state={state} onChange={handleChange} systemId={system.id} role={role}>
      <ThemeBridge theme={state.prefs.theme} />
      <div className={`board density-${state.prefs.density}`} style={themeVars(state.prefs.theme)}>
        <header className="top">
          <div className="top-left">
            <button type="button" className="menu-toggle" onClick={onToggleMenu} title="Menu">☰</button>
            <h1>
              <span className="board-name">{system.name}</span>
              <OverflowMenu
                title="System options"
                align="left"
                items={[
                  { label: 'Rename system', onSelect: () => onRename(system.id), disabled: role !== 'owner' },
                ]}
              />
            </h1>
            {system.memberCount > 1 && (
              <span className="shared-chip" title={`${system.memberCount} people have access`}>
                Shared · {system.memberCount}
              </span>
            )}
          </div>
          <div className="date mono">{longDateLabel()}</div>
        </header>

        <div id="app">
          {view === 'dashboard' && <Dashboard />}
          {view === 'projects' && <ProjectsView />}
          {view === 'manage' && <ManageView />}
        </div>

        <footer className="foot">
          <span>{saveStatus}</span>
          <span className="foot-role">{role === 'owner' ? 'Owner' : 'Shared with you'}</span>
        </footer>
      </div>
    </AppProvider>
  );
}

/**
 * Mirrors the palette onto the root element so the sidebar, the page behind the
 * board and native controls follow the theme too.
 */
function ThemeBridge({ theme }: { theme: Theme }) {
  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVars(theme) as Record<string, string>;
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    root.style.colorScheme = isLight(theme.paper) ? 'light' : 'dark';
  }, [theme]);
  return null;
}

/** Rough luminance test, used to keep native controls readable on light themes. */
function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

function themeVars(theme: Theme): CSSProperties {
  return {
    '--paper': theme.paper,
    '--panel': theme.panel,
    '--panel-raised': theme.panelRaised,
    '--ink': theme.ink,
    '--ink-soft': theme.inkSoft,
    '--ink-faint': theme.inkFaint,
    '--line': theme.line,
    '--accent': theme.accent,
  } as CSSProperties;
}
