'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppState } from '@/lib/types';
import { clone } from '@/lib/utils';

interface AppContextValue {
  state: AppState;
  /** Apply a mutation to a copy of the state and commit it. */
  update: (fn: (draft: AppState) => void) => void;
  /** Swap in a whole new state, used by the data import. */
  replaceState: (next: AppState) => void;
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
  children: ReactNode;
}

export function AppProvider({ state, onChange, children }: Props) {
  const [editingDue, setEditingDue] = useState<Set<string>>(() => new Set());

  const update = useCallback(
    (fn: (draft: AppState) => void) => {
      const draft = clone(state);
      fn(draft);
      onChange(draft);
    },
    [state, onChange],
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
    () => ({ state, update, replaceState: onChange, isEditingDue, setDueEditing }),
    [state, update, onChange, isEditingDue, setDueEditing],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
