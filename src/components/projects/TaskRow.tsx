'use client';

import { useState } from 'react';
import { resolveQuickDate } from '@/lib/date';
import { subtasksOf } from '@/lib/selectors';
import type { Task } from '@/lib/types';
import { newTask } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { DueField } from '@/components/ui/DueField';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { MemberSelect, QuickDateSelect } from '@/components/ui/Selects';

export const TASK_DRAG_TYPE = 'application/x-calver-task';

interface Props {
  /** Ref of this row's task, as understood by findTaskByRef. */
  taskRef: string;
  task: Task;
  /** `<projectId>:<taskId>`, set only for tasks that can move between projects. */
  dragId?: string;
  isSubtask?: boolean;
  onEdit: (fn: (t: Task) => void) => void;
  onRemove: () => void;
  /** Absent on subtasks, which cannot nest further. */
  onAddSubtask?: (task: Task) => void;
}

export function TaskRow({
  taskRef, task, dragId, isSubtask = false, onEdit, onRemove, onAddSubtask,
}: Props) {
  const { prefs, label } = useApp();
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [addingSub, setAddingSub] = useState(false);

  const subtasks = subtasksOf(task);
  const visibleSubtasks = prefs.showCompletedTasks ? subtasks : subtasks.filter((s) => !s.done);
  const hiddenSubtasks = subtasks.length - visibleSubtasks.length;
  const doneSubtasks = subtasks.filter((s) => s.done).length;

  const editSubtask = (subId: string, fn: (t: Task) => void) =>
    onEdit((parent) => {
      const sub = subtasksOf(parent).find((x) => x.id === subId);
      if (sub) fn(sub);
    });

  const removeSubtask = (subId: string) =>
    onEdit((parent) => { parent.subtasks = subtasksOf(parent).filter((x) => x.id !== subId); });

  return (
    <>
      <div
        className={[
          'task-row',
          task.done ? 'done' : '',
          dragging ? 'dragging' : '',
          isSubtask ? 'subtask-row' : '',
          task.lowVolume ? 'is-low-volume' : '',
        ].filter(Boolean).join(' ')}
        draggable={Boolean(dragId)}
        onDragStart={(e) => {
          if (!dragId) return;
          // A dedicated type so cards and status bands can tell the two kinds
          // of drag apart during dragover, where the payload is unreadable.
          e.dataTransfer.setData(TASK_DRAG_TYPE, dragId);
          e.dataTransfer.setData('text/plain', task.text);
          e.dataTransfer.effectAllowed = 'move';
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
      >
        {isSubtask ? (
          <span className="subtask-tick" aria-hidden>↳</span>
        ) : (
          <span className="drag-handle" title="Drag to move to another project">⠿</span>
        )}
        <input
          type="checkbox"
          draggable={false}
          checked={task.done}
          onChange={(e) => {
            const done = e.target.checked;
            onEdit((t) => { t.done = done; });
          }}
        />
        <div className="t-text">
          <EditableText
            value={task.text}
            onCommit={(next) => onEdit((t) => { t.text = next; })}
            editing={renaming}
            onEditingChange={setRenaming}
          />
          {task.lowVolume && <span className="lv-tag">{label('term.lowVolume')}</span>}
          {!isSubtask && subtasks.length > 0 && (
            <span className="sub-count mono" title="Subtasks complete">
              {doneSubtasks}/{subtasks.length}
            </span>
          )}
        </div>
        <MemberSelect
          draggable={false}
          value={task.assignee}
          onChange={(v) => onEdit((t) => { t.assignee = v; })}
        />
        <div className="t-due-wrap" draggable={false}>
          <DueField taskRef={taskRef} due={task.due} />
        </div>
        <OverflowMenu
          title={`${label(isSubtask ? 'term.subtask' : 'term.task')} options`}
          items={[
            { label: 'Rename', onSelect: () => setRenaming(true) },
            ...(onAddSubtask
              ? [{ label: `Add ${label('term.subtask').toLowerCase()}`, onSelect: () => setAddingSub(true) }]
              : []),
            {
              label: `Tag as ${label('term.lowVolume').toLowerCase()}`,
              checked: task.lowVolume === true,
              onSelect: () => onEdit((t) => { t.lowVolume = !t.lowVolume; }),
            },
            {
              label: task.done ? 'Mark as not done' : 'Mark as done',
              onSelect: () => onEdit((t) => { t.done = !t.done; }),
            },
            { label: 'Clear due date', onSelect: () => onEdit((t) => { t.due = null; }), disabled: !task.due },
            { label: 'Unassign', onSelect: () => onEdit((t) => { t.assignee = ''; }), disabled: !task.assignee },
            'separator',
            { label: 'Move to trash', onSelect: onRemove, danger: true },
          ]}
        />
      </div>

      {visibleSubtasks.map((sub) => (
        <TaskRow
          key={sub.id}
          taskRef={`${taskRef}:${sub.id}`}
          task={sub}
          isSubtask
          onEdit={(fn) => editSubtask(sub.id, fn)}
          onRemove={() => removeSubtask(sub.id)}
        />
      ))}

      {!isSubtask && hiddenSubtasks > 0 && (
        <div className="subtask-hidden-note">
          {hiddenSubtasks} completed {label('term.subtask').toLowerCase()}
          {hiddenSubtasks === 1 ? '' : 's'} hidden
        </div>
      )}

      {addingSub && onAddSubtask && (
        <AddSubtaskRow
          onCancel={() => setAddingSub(false)}
          onAdd={(sub) => {
            onAddSubtask(sub);
            setAddingSub(false);
          }}
        />
      )}
    </>
  );
}

function AddSubtaskRow({
  onAdd, onCancel,
}: {
  onAdd: (task: Task) => void;
  onCancel: () => void;
}) {
  const { label } = useApp();
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [quick, setQuick] = useState('');
  const [due, setDue] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    onAdd(newTask({ text: trimmed, due: due || null, assignee }));
  };

  return (
    <div className="add-row subtask-add">
      <span className="subtask-tick" aria-hidden>↳</span>
      <input
        type="text"
        autoFocus
        placeholder={label('placeholder.newSubtask')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <MemberSelect className="" value={assignee} onChange={setAssignee} />
      <QuickDateSelect
        value={quick}
        onChange={(v) => {
          setQuick(v);
          const resolved = resolveQuickDate(v);
          if (resolved) setDue(resolved);
        }}
      />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <button type="button" onClick={add}>Add</button>
      <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
    </div>
  );
}
