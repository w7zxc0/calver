'use client';

import { useState } from 'react';
import { trashPush } from '@/lib/mutations';
import { findTaskByRef } from '@/lib/selectors';
import type { FlatTask, Task } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { DueField } from '@/components/ui/DueField';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { AssigneeLabel, ProjectOrGeneralLabel } from '@/components/ui/Pills';
import { MemberSelect } from '@/components/ui/Selects';

/**
 * One task on the dashboard. Subtasks use the same row, with a note of the
 * task they belong to, so both levels read the same way.
 */
export function DashboardTaskRow({ task }: { task: FlatTask }) {
  const { state, update, label } = useApp();
  const [renaming, setRenaming] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const isSubtask = task.parentText !== null;

  const edit = (fn: (t: Task) => void) =>
    update((draft) => {
      const handle = findTaskByRef(draft, task.ref);
      if (handle) fn(handle.task);
    });

  const remove = () =>
    update((draft) => {
      const handle = findTaskByRef(draft, task.ref);
      if (!handle) return;
      trashPush(draft, { type: 'task', payload: handle.task, extra: { projectId: handle.projectId } });
      handle.remove();
    });

  return (
    <div className={`due-row${task.done ? ' row-done' : ''}${isSubtask ? ' is-subtask' : ''}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => {
          const done = e.target.checked;
          edit((t) => { t.done = done; });
        }}
      />
      <div className="txt">
        <div className="name">
          {isSubtask && <span className="subtask-tick" aria-hidden>↳</span>}
          <EditableText
            value={task.text}
            onCommit={(next) => edit((t) => { t.text = next; })}
            editing={renaming}
            onEditingChange={setRenaming}
          />
          {task.lowVolume && <span className="lv-tag">{label('term.lowVolume')}</span>}
        </div>
        {isSubtask && (
          <div className="sub">
            {label('term.subtask')} of {task.parentText}
          </div>
        )}
        {reassigning && (
          <div className="sub">
            <MemberSelect
              value={task.assignee}
              onChange={(v) => {
                edit((t) => { t.assignee = v; });
                setReassigning(false);
              }}
            />
          </div>
        )}
      </div>
      <div className="tags">
        <AssigneeLabel assignee={task.assignee} />
        <ProjectOrGeneralLabel projectName={task.projectName} projectColor={task.projectColor} />
        <DueField taskRef={task.ref} due={task.due} />
      </div>
      <OverflowMenu
        title={`${label(isSubtask ? 'term.subtask' : 'term.task')} options`}
        items={[
          { label: 'Rename', onSelect: () => setRenaming(true) },
          {
            label: 'Reassign',
            onSelect: () => setReassigning((v) => !v),
            disabled: state.members.length === 0,
          },
          {
            label: `Tag as ${label('term.lowVolume').toLowerCase()}`,
            checked: task.lowVolume,
            onSelect: () => edit((t) => { t.lowVolume = !t.lowVolume; }),
          },
          {
            label: task.done ? 'Mark as not done' : 'Mark as done',
            onSelect: () => edit((t) => { t.done = !t.done; }),
          },
          'separator',
          { label: 'Move to trash', onSelect: remove, danger: true },
        ]}
      />
    </div>
  );
}
