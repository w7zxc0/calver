'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError, createSystem, deleteSystem as deleteSystemApi, fetchSystems,
  removeMember, renameSystem as renameSystemApi, signOut,
} from '@/lib/api';
import type { AuthUser, SystemSummary, ViewId } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import { SystemBoard } from '@/components/SystemBoard';

const LAST_SYSTEM_KEY = 'calver.lastSystem';

function rememberSystem(id: string) {
  try {
    window.localStorage.setItem(LAST_SYSTEM_KEY, id);
  } catch {
    // Private windows can refuse storage; the choice just will not persist.
  }
}

function recallSystem(): string | null {
  try {
    return window.localStorage.getItem(LAST_SYSTEM_KEY);
  } catch {
    return null;
  }
}

export function Workbench({ user, onSignedOut }: { user: AuthUser; onSignedOut: () => void }) {
  const [systems, setSystems] = useState<SystemSummary[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (preferId?: string) => {
    setError(null);
    try {
      const { systems: list } = await fetchSystems();
      setSystems(list);
      setCurrentId((previous) => {
        const wanted = preferId ?? previous ?? recallSystem();
        const match = list.find((s) => s.id === wanted);
        return (match ?? list[0])?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your systems.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (currentId) rememberSystem(currentId);
  }, [currentId]);

  const selectSystem = (id: string) => {
    setCurrentId(id);
    setMenuOpen(false);
  };

  const addSystem = async () => {
    const name = window.prompt('Name the new system', `System ${(systems?.length ?? 0) + 1}`);
    if (name === null) return;
    const seed = window.confirm('Start it with sample projects? Cancel for an empty board.');
    try {
      const created = await createSystem(name.trim() || 'New system', seed);
      await refresh(created.id);
      setMenuOpen(false);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not create that system.');
    }
  };

  const rename = async (id: string) => {
    const system = systems?.find((s) => s.id === id);
    const name = window.prompt('Rename system', system?.name ?? '');
    if (name === null || name.trim() === '') return;
    try {
      await renameSystemApi(id, name.trim());
      await refresh(id);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not rename that system.');
    }
  };

  const remove = async (id: string) => {
    const system = systems?.find((s) => s.id === id);
    if (!window.confirm(`Delete "${system?.name ?? 'this system'}" and everything in it? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteSystemApi(id);
      await refresh();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not delete that system.');
    }
  };

  const leave = async (id: string) => {
    const system = systems?.find((s) => s.id === id);
    if (!window.confirm(`Leave "${system?.name ?? 'this system'}"? You will lose access until it is shared again.`)) {
      return;
    }
    try {
      await removeMember(id, user.id);
      await refresh();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not leave that system.');
    }
  };

  const leaveAccount = async () => {
    try {
      await signOut();
    } finally {
      onSignedOut();
    }
  };

  const current = systems?.find((s) => s.id === currentId) ?? null;

  return (
    <div className="workbench">
      <Sidebar
        user={user}
        systems={systems ?? []}
        currentSystemId={currentId}
        view={view}
        open={menuOpen}
        onSelectSystem={selectSystem}
        onSelectView={(v) => {
          setView(v);
          setMenuOpen(false);
        }}
        onCreateSystem={() => void addSystem()}
        onRenameSystem={(id) => void rename(id)}
        onDeleteSystem={(id) => void remove(id)}
        onLeaveSystem={(id) => void leave(id)}
        onSignOut={() => void leaveAccount()}
        onClose={() => setMenuOpen(false)}
      />

      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <main className="workspace">
        {error ? (
          <div className="loading">
            <div>{error}</div>
            <button className="btn" type="button" onClick={() => void refresh()} style={{ marginTop: 12 }}>
              Try again
            </button>
          </div>
        ) : systems === null ? (
          <div className="loading">Loading…</div>
        ) : current ? (
          <SystemBoard
            key={current.id}
            system={current}
            view={view}
            onRename={(id) => void rename(id)}
            onToggleMenu={() => setMenuOpen((v) => !v)}
          />
        ) : (
          <div className="loading">
            <div>You have no systems yet.</div>
            <button className="btn" type="button" onClick={() => void addSystem()} style={{ marginTop: 12 }}>
              Create one
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
