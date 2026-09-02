'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { longDateLabel } from '@/lib/date';
import { DEFAULT_LABELS } from '@/lib/labels';
import { freshState } from '@/lib/seed';
import { fetchState, persistState } from '@/lib/storage';
import type { AppState, Theme, ViewId } from '@/lib/types';
import { AppProvider, useApp } from '@/components/AppProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ManageView } from '@/components/manage/ManageView';
import { ProjectsView } from '@/components/projects/ProjectsView';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

const TABS: { id: ViewId; labelKey: string }[] = [
  { id: 'dashboard', labelKey: 'tab.dashboard' },
  { id: 'projects', labelKey: 'tab.projects' },
  { id: 'manage', labelKey: 'tab.manage' },
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

  if (loadError) {
    return (
      <div className="shell">
        <div className="loading">
          <div>Could not load your data.</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12, margin: '8px 0 14px' }}>{loadError}</div>
          <button className="btn" type="button" onClick={() => void load()}>Try again</button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="shell">
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <AppProvider state={state} onChange={handleChange}>
      <Board
        view={view}
        onView={setView}
        saveStatus={saveStatus}
        onReset={() => setState(freshState())}
      />
    </AppProvider>
  );
}

function Board({
  view, onView, saveStatus, onReset,
}: {
  view: ViewId;
  onView: (v: ViewId) => void;
  saveStatus: string;
  onReset: () => void;
}) {
  const { prefs, label, setLabel, resetLabel } = useApp();
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [renamingTab, setRenamingTab] = useState<string | null>(null);

  // Mirror the palette onto the root element so the page behind the shell,
  // form controls and the browser's own chrome follow it too.
  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVars(prefs.theme) as Record<string, string>;
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    root.style.colorScheme = isLight(prefs.theme.paper) ? 'light' : 'dark';
  }, [prefs.theme]);

  const reset = () => {
    if (!window.confirm('Reset all data back to the starting board? This cannot be undone.')) return;
    onReset();
  };

  return (
    <div className={`shell density-${prefs.density}`} style={themeVars(prefs.theme)}>
      <header className="top">
        <h1>
          <EditableText
            value={label('app.title')}
            onCommit={(next) => setLabel('app.title', next)}
            editing={renamingTitle}
            onEditingChange={setRenamingTitle}
          />
          <OverflowMenu
            title="Board options"
            align="left"
            items={[
              { label: 'Rename board', onSelect: () => setRenamingTitle(true) },
              {
                label: 'Reset name',
                onSelect: () => resetLabel('app.title'),
                disabled: label('app.title') === DEFAULT_LABELS['app.title'],
              },
            ]}
          />
        </h1>
        <div className="date mono">{longDateLabel()}</div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <span className={`tab${view === t.id ? ' active' : ''}`} key={t.id}>
            <button type="button" onClick={() => onView(t.id)}>
              <EditableText
                value={label(t.labelKey)}
                onCommit={(next) => setLabel(t.labelKey, next)}
                editing={renamingTab === t.labelKey}
                onEditingChange={(editing) => setRenamingTab(editing ? t.labelKey : null)}
              />
            </button>
            <OverflowMenu
              title="Tab options"
              items={[
                { label: 'Rename', onSelect: () => setRenamingTab(t.labelKey) },
                {
                  label: 'Reset name',
                  onSelect: () => resetLabel(t.labelKey),
                  disabled: label(t.labelKey) === DEFAULT_LABELS[t.labelKey],
                },
              ]}
            />
          </span>
        ))}
      </nav>

      <div id="app">
        {view === 'dashboard' && <Dashboard />}
        {view === 'projects' && <ProjectsView />}
        {view === 'manage' && <ManageView />}
      </div>

      <footer className="foot">
        <span>{saveStatus}</span>
        <button type="button" onClick={reset}>{label('footer.reset')}</button>
      </footer>
    </div>
  );
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

/** Feeds the user's palette straight into the CSS variables the sheet reads. */
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
