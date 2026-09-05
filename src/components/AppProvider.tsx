'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { labelOf } from '@/lib/labels';
import type { AppState, Preferences, SystemRole } from '@/lib/types';
import { clone } from '@/lib/utils';

interface AppContextValue {
  state: AppState;
  prefs: Preferences;
  /** Which system this board belongs to, for the sharing screen. */
  systemId: string;
  role: SystemRole;
  /** Apply a mutation to a copy of the state and commit it. */
  update: (fn: (draft: AppState) => void) => void;
  /** Swap in a whole new state, used by the data import. */
  replaceState: (next: AppState) => void;

  /** Wording, with the user's override applied. */
  label: (key: string) => string;
  setLabel: (key: string, value: string) => void;
  resetLabel: (key: string) => void;

  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  isHidden: (key: string) => boolean;
  toggleHidden: (key: string) => void;

  isEditingDue: (ref: string) => boolean;
  setDueEditing: (ref: string, on: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

interface Props {
  state: AppState;
  onChange: (next: AppState) => void;
  systemId: string;
  role: SystemRole;
  children: ReactNode;
}

export function AppProvider({ state, onChange, systemId, role, children }: Props) {
  const [editingDue, setEditingDue] = useState<Set<string>>(() => new Set());

  const update = useCallback(
    (fn: (draft: AppState) => void) => {
      const draft = clone(state);
      fn(draft);
      onChange(draft);
    },
    [state, onChange],
  );

  const label = useCallback((key: string) => labelOf(state.prefs, key), [state.prefs]);

  const setLabel = useCallback(
    (key: string, value: string) => update((draft) => { draft.prefs.labels[key] = value; }),
    [update],
  );

  const resetLabel = useCallback(
    (key: string) => update((draft) => { delete draft.prefs.labels[key]; }),
    [update],
  );

  const setPref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      update((draft) => { draft.prefs[key] = value; }),
    [update],
  );

  const isHidden = useCallback((key: string) => state.prefs.hidden[key] === true, [state.prefs]);

  const toggleHidden = useCallback(
    (key: string) =>
      update((draft) => {
        if (draft.prefs.hidden[key]) delete draft.prefs.hidden[key];
        else draft.prefs.hidden[key] = true;
      }),
    [update],
  );

  const setDueEditing = useCallback((ref: string, on: boolean) => {
    setEditingDue((prev) => {
      if (on === prev.has(ref)) return prev;
      const next = new Set(prev);
      if (on) next.add(ref);
      else next.delete(ref);
      return next;
    });
  }, []);

  const isEditingDue = useCallback((ref: string) => editingDue.has(ref), [editingDue]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      prefs: state.prefs,
      systemId,
      role,
      update,
      replaceState: onChange,
      label,
      setLabel,
      resetLabel,
      setPref,
      isHidden,
      toggleHidden,
      isEditingDue,
      setDueEditing,
    }),
    [
      state, systemId, role, update, onChange, label, setLabel, resetLabel, setPref,
      isHidden, toggleHidden, isEditingDue, setDueEditing,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
