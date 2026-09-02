'use client';

import { useState } from 'react';
import { ME_ID } from '@/lib/constants';
import { daysUntil, resolveQuickDate } from '@/lib/date';
import { trashPush } from '@/lib/mutations';
import { allTasksFlat, findTaskByRef } from '@/lib/selectors';
import type { FlatTask } from '@/lib/types';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { DueField } from '@/components/ui/DueField';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { AssigneeLabel, ProjectOrGeneralLabel } from '@/components/ui/Pills';
import { EditableText } from '@/components/ui/EditableText';
import { MemberSelect, ProjectSelect, QuickDateSelect } from '@/components/ui/Selects';

export function DuePanel() {
  const { state, prefs, update, setPref, label } = useApp();

  // What the window lists is exactly what its count reports.
  const listed = allTasksFlat(state)
    .filter((t) => (prefs.showCompletedInDue ? true : !t.done))
    .filter((t) => (prefs.showTasksWithoutDue ? true : Boolean(t.due)))
    .sort((a, b) => {
      const mineA = a.assignee === ME_ID ? 0 : 1;
      const mineB = b.assignee === ME_ID ? 0 : 1;
      if (mineA !== mineB) return mineA - mineB;
      const dueA = a.due === null ? Number.MAX_SAFE_INTEGER : (daysUntil(a.due) as number);
      const dueB = b.due === null ? Number.MAX_SAFE_INTEGER : (daysUntil(b.due) as number);
      return dueA - dueB;
    });

  const setDone = (ref: string, done: boolean) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (handle) handle.task.done = done;
    });

  const rename = (ref: string, text: string) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (handle) handle.task.text = text;
    });

  const setAssignee = (ref: string, assignee: string) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (handle) handle.task.assignee = assignee;
    });

  const removeTask = (ref: string) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (!handle) return;
      trashPush(draft, { type: 'task', payload: handle.task, extra: { projectId: handle.projectId } });
      handle.remove();
    });

  return (
    <div className="panel">
      <PanelHeader
        labelKey="panel.due"
        count={listed.length}
        hideKey="panel.due"
        extraItems={[
          {
            label: 'Include tasks with no due date',
            checked: prefs.showTasksWithoutDue,
            onSelect: () => setPref('showTasksWithoutDue', !prefs.showTasksWithoutDue),
          },
          {
            label: 'Include completed tasks',
            checked: prefs.showCompletedInDue,
            onSelect: () => setPref('showCompletedInDue', !prefs.showCompletedInDue),
          },
        ]}
      />
      {listed.length ? (
        listed.map((t) => (
          <DueRow
            key={t.ref}
            task={t}
            onToggle={setDone}
            onRename={rename}
            onAssign={setAssignee}
            onRemove={removeTask}
          />
        ))
      ) : (
        <div className="empty">Nothing listed. Add {label('term.task').toLowerCase()} below.</div>
      )}
      <div className="panel-add-row">
        <AddTaskRow />
      </div>
    </div>
  );
}

function DueRow({
  task, onToggle, onRename, onAssign, onRemove,
}: {
  task: FlatTask;
  onToggle: (ref: string, done: boolean) => void;
  onRename: (ref: string, text: string) => void;
  onAssign: (ref: string, assignee: string) => void;
  onRemove: (ref: string) => void;
}) {
  const { state, label } = useApp();
  const [renaming, setRenaming] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  return (
    <div className={`due-row${task.done ? ' row-done' : ''}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(task.ref, e.target.checked)}
      />
      <div className="txt">
        <div className="name">
          <EditableText
            value={task.text}
            onCommit={(next) => onRename(task.ref, next)}
            editing={renaming}
            onEditingChange={setRenaming}
          />
        </div>
        {reassigning && (
          <div className="sub">
            <MemberSelect
              value={task.assignee}
              onChange={(v) => {
                onAssign(task.ref, v);
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
        title={`${label('term.task')} options`}
        items={[
          { label: 'Rename', onSelect: () => setRenaming(true) },
          { label: 'Reassign', onSelect: () => setReassigning((v) => !v), disabled: state.members.length === 0 },
          {
            label: task.done ? 'Mark as not done' : 'Mark as done',
            onSelect: () => onToggle(task.ref, !task.done),
          },
          'separator',
          { label: 'Move to trash', onSelect: () => onRemove(task.ref), danger: true },
        ]}
      />
    </div>
  );
}

function AddTaskRow() {
  const { update, label } = useApp();
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [projectId, setProjectId] = useState('');
  const [quick, setQuick] = useState('');
  const [date, setDate] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    update((draft) => {
      const task = { id: uid(), text: trimmed, done: false, due: date || null, assignee };
      const p = draft.projects.find((x) => x.id === projectId);
      if (p) p.tasks.push(task);
      else draft.generalTasks.push(task);
    });
    setText('');
    setQuick('');
    setDate('');
  };

  return (
    <div className="add-row">
      <input
        type="text"
        placeholder={label('placeholder.newTask')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <MemberSelect className="" value={assignee} onChange={setAssignee} />
      <ProjectSelect value={projectId} onChange={setProjectId} />
      <QuickDateSelect
        value={quick}
        onChange={(v) => {
          setQuick(v);
          const resolved = resolveQuickDate(v);
          if (resolved) setDate(resolved);
        }}
      />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button type="button" onClick={add}>{label('action.addTask')}</button>
    </div>
  );
}
