'use client';

import { trashPush } from '@/lib/mutations';
import { allTasksFlat, findTaskByRef } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { AssigneeLabel, ProjectOrGeneralLabel } from '@/components/ui/Pills';
import { ManageBlock } from './ManageBlock';

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
    <ManageBlock
      labelKey="block.completed"
      count={completed.length}
      extraItems={[
        {
          label: 'Reopen all',
          disabled: completed.length === 0,
          onSelect: () =>
            update((draft) => {
              draft.projects.forEach((p) => p.tasks.forEach((t) => { t.done = false; }));
              draft.generalTasks.forEach((t) => { t.done = false; });
            }),
        },
        {
          label: 'Move all to trash',
          danger: true,
          disabled: completed.length === 0,
          onSelect: () => {
            if (!window.confirm(`Move ${completed.length} completed task(s) to trash?`)) return;
            update((draft) => {
              completed.forEach((t) => {
                const handle = findTaskByRef(draft, t.ref);
                if (!handle) return;
                trashPush(draft, {
                  type: 'task', payload: handle.task, extra: { projectId: handle.projectId },
                });
                handle.remove();
              });
            });
          },
        },
      ]}
    >
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
            <ProjectOrGeneralLabel projectName={t.projectName} projectColor={t.projectColor} />
          </div>
          <OverflowMenu
            items={[
              { label: 'Mark as not done', onSelect: () => uncomplete(t.ref) },
              'separator',
              { label: 'Move to trash', onSelect: () => remove(t.ref), danger: true },
            ]}
          />
        </div>
      ))}
    </ManageBlock>
  );
}
