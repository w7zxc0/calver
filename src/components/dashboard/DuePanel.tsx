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
import { AssigneeLabel, ProjectOrGeneralLabel } from '@/components/ui/Pills';
import { MemberSelect, ProjectSelect, QuickDateSelect } from '@/components/ui/Selects';

export function DuePanel() {
  const { state, update } = useApp();

  const dueTasks = allTasksFlat(state)
    .filter((t) => !t.done && t.due)
    .sort((a, b) => {
      const mineA = a.assignee === ME_ID ? 0 : 1;
      const mineB = b.assignee === ME_ID ? 0 : 1;
      if (mineA !== mineB) return mineA - mineB;
      return (daysUntil(a.due) as number) - (daysUntil(b.due) as number);
    });

  const setDone = (ref: string, done: boolean) =>
    update((draft) => {
      const handle = findTaskByRef(draft, ref);
      if (handle) handle.task.done = done;
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
      <h2>
        Due <span className="count">{dueTasks.length}</span>
      </h2>
      {dueTasks.length ? (
        dueTasks.map((t) => (
          <DueRow key={t.ref} task={t} onToggle={setDone} onRemove={removeTask} />
        ))
      ) : (
        <div className="empty">Nothing due. Add a task below.</div>
      )}
      <div className="panel-add-row">
        <AddTaskRow />
      </div>
    </div>
  );
}

function DueRow({
  task, onToggle, onRemove,
}: {
  task: FlatTask;
  onToggle: (ref: string, done: boolean) => void;
  onRemove: (ref: string) => void;
}) {
  return (
    <div className="due-row">
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(task.ref, e.target.checked)}
      />
      <div className="txt">
        <div className="name">{task.text}</div>
      </div>
      <div className="tags">
        <AssigneeLabel assignee={task.assignee} />
        <ProjectOrGeneralLabel projectName={task.projectName} />
        <DueField taskRef={task.ref} due={task.due} />
      </div>
      <button type="button" className="rm" title="Move to trash" onClick={() => onRemove(task.ref)}>
        🗑
      </button>
    </div>
  );
}

function AddTaskRow() {
  const { update } = useApp();
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
        placeholder="New task"
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
      <button type="button" onClick={add}>Add task</button>
    </div>
  );
}
