'use client';

import { trashPush } from '@/lib/mutations';
import { allTasksFlat, findTaskByRef } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';
import { AssigneeLabel, ProjectOrGeneralLabel } from '@/components/ui/Pills';

export function CompletedBlock() {
  const { state, update } = useApp();

  const completed = allTasksFlat(state)
    .filter((t) => t.done)
    .sort(
      (a, b) =>
        (a.projectName || '').localeCompare(b.projectName || '') || a.text.localeCompare(b.text),
    );

  const uncomplete = (ref: string) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (handle) handle.task.done = false;
    });

  const remove = (ref: string) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (!handle) return;
      trashPush(draft, { type: 'task', payload: handle.task, extra: { projectId: handle.projectId } });
      handle.remove();
    });

  return (
    <div className="manage-block">
      <h2>
        Completed Tasks <span className="count">{completed.length}</span>
      </h2>
      {completed.length === 0 && (
        <div className="manage-note" style={{ marginTop: 0 }}>Nothing completed yet.</div>
      )}
      {completed.map((t) => (
        <div className="due-row" key={t.ref}>
          <input type="checkbox" checked onChange={() => uncomplete(t.ref)} />
          <div className="txt">
            <div className="name" style={{ textDecoration: 'line-through', color: 'var(--ink-faint)' }}>
              {t.text}
            </div>
          </div>
          <div className="tags">
            <AssigneeLabel assignee={t.assignee} />
            <ProjectOrGeneralLabel projectName={t.projectName} />
          </div>
          <button className="rm" title="Move to trash" onClick={() => remove(t.ref)}>🗑</button>
        </div>
      ))}
    </div>
  );
}
