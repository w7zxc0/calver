'use client';

import { resolveQuickDate } from '@/lib/date';
import { findTaskByRef } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';
import { DueChip } from '@/components/ui/Pills';
import { QuickDateSelect } from '@/components/ui/Selects';

/**
 * A due date shown as a low-key chip, swapped for a quick-pick + calendar pair
 * while it is being edited.
 */
export function DueField({ taskRef, due }: { taskRef: string; due: string | null }) {
  const { update, isEditingDue, setDueEditing } = useApp();

  const commit = (value: string | null) => {
    update((draft) => {
      const handle = findTaskByRef(draft, taskRef);
      if (handle) handle.task.due = value;
    });
    setDueEditing(taskRef, false);
  };

  if (isEditingDue(taskRef)) {
    return (
      <span className="due-field">
        <QuickDateSelect
          className="due-edit-quick"
          value=""
          onChange={(v) => {
            if (v === '') return;
            commit(resolveQuickDate(v));
          }}
        />
        <input
          type="date"
          className="due-edit-input"
          defaultValue={due || ''}
          onChange={(e) => commit(e.target.value || null)}
          onBlur={() => setDueEditing(taskRef, false)}
        />
      </span>
    );
  }

  return (
    <span className="due-field">
      <DueChip due={due} />
      <button
        type="button"
        className="edit-ico"
        title="Change due date"
        onClick={() => setDueEditing(taskRef, true)}
      >
        ✎
      </button>
    </span>
  );
}
