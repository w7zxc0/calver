'use client';

import { useState } from 'react';
import { fmtDate, daysUntil, resolveQuickDate } from '@/lib/date';
import { trashPush } from '@/lib/mutations';
import { getStatus } from '@/lib/selectors';
import type { Project, Task } from '@/lib/types';
import { hexA, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { DueField } from '@/components/ui/DueField';
import { MemberSelect, QuickDateSelect, StatusSelect } from '@/components/ui/Selects';

interface Props {
  project: Project;
  /** Called when a task dragged from another project is dropped on this card. */
  onDropTask: (sourceProjectId: string, taskId: string, destProjectId: string) => void;
}

export function ProjectCard({ project: p, onDropTask }: Props) {
  const { state, update } = useApp();
  const [dragOver, setDragOver] = useState(false);

  const st = getStatus(state, p.status);
  const openTasks = p.tasks.filter((t) => !t.done).length;
  const nextDue = p.tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => (daysUntil(a.due) as number) - (daysUntil(b.due) as number))[0];

  /** Edits to a project always leave it expanded, as in the original. */
  const editProject = (fn: (proj: Project) => void) =>
    update((draft) => {
      const proj = draft.projects.find((x) => x.id === p.id);
      if (!proj) return;
      fn(proj);
      proj.open = true;
    });

  const toggleOpen = () =>
    update((draft) => {
      const proj = draft.projects.find((x) => x.id === p.id);
      if (proj) proj.open = !proj.open;
    });

  const removeProject = () => {
    if (!window.confirm('Move this project and all its tasks to trash?')) return;
    update((draft) => {
      const proj = draft.projects.find((x) => x.id === p.id);
      if (!proj) return;
      trashPush(draft, { type: 'project', payload: proj });
      draft.projects = draft.projects.filter((x) => x.id !== p.id);
    });
  };

  const removeTask = (taskId: string) =>
    update((draft) => {
      const proj = draft.projects.find((x) => x.id === p.id);
      const t = proj?.tasks.find((x) => x.id === taskId);
      if (!proj || !t) return;
      trashPush(draft, { type: 'task', payload: t, extra: { projectId: p.id } });
      proj.tasks = proj.tasks.filter((x) => x.id !== taskId);
      proj.open = true;
    });

  return (
    <div
      className={`proj-card${st?.terminal ? ' tint-done' : ''}${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const data = e.dataTransfer.getData('text/plain');
        if (!data || !data.includes(':')) return;
        const [srcPid, tid] = data.split(':');
        onDropTask(srcPid, tid, p.id);
      }}
    >
      <div className="proj-head" onClick={toggleOpen}>
        <div className="left">
          <span className="chevron">{p.open ? '▾' : '▸'}</span>
          <div>
            <div className="proj-name">{p.name}</div>
            <div className="proj-meta">
              {openTasks} open task{openTasks === 1 ? '' : 's'}
              {nextDue ? ` · next: ${fmtDate(nextDue.due)}` : ''}
            </div>
          </div>
        </div>
        <StatusSelect
          className="status-select"
          style={{
            background: st ? hexA(st.color, 0.16) : 'transparent',
            color: st ? st.color : 'var(--ink)',
          }}
          value={p.status}
          onChange={(v) => editProject((proj) => { proj.status = v; })}
        />
      </div>

      <div className={`proj-body${p.open ? ' open' : ''}`}>
        <button className="rm" style={{ float: 'right' }} title="Move project to trash" onClick={removeProject}>
          🗑
        </button>
        <div style={{ clear: 'both' }} />

        {p.tasks.map((t) => (
          <TaskRow
            key={t.id}
            projectId={p.id}
            task={t}
            onToggleDone={(done) =>
              editProject((proj) => {
                const target = proj.tasks.find((x) => x.id === t.id);
                if (target) target.done = done;
              })
            }
            onAssign={(assignee) =>
              editProject((proj) => {
                const target = proj.tasks.find((x) => x.id === t.id);
                if (target) target.assignee = assignee;
              })
            }
            onRemove={() => removeTask(t.id)}
          />
        ))}

        <AddTaskRow
          onAdd={(task) => editProject((proj) => { proj.tasks.push(task); })}
        />

        <textarea
          className="notes-field"
          placeholder="Notes"
          value={p.notes || ''}
          onChange={(e) => {
            const notes = e.target.value;
            update((draft) => {
              const proj = draft.projects.find((x) => x.id === p.id);
              if (proj) proj.notes = notes;
            });
          }}
        />
      </div>
    </div>
  );
}

function TaskRow({
  projectId, task, onToggleDone, onAssign, onRemove,
}: {
  projectId: string;
  task: Task;
  onToggleDone: (done: boolean) => void;
  onAssign: (assignee: string) => void;
  onRemove: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`task-row${task.done ? ' done' : ''}${dragging ? ' dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', `${projectId}:${task.id}`);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
    >
      <span className="drag-handle" title="Drag to move to another project">⠿</span>
      <input
        type="checkbox"
        draggable={false}
        checked={task.done}
        onChange={(e) => onToggleDone(e.target.checked)}
      />
      <div className="t-text">{task.text}</div>
      <MemberSelect draggable={false} value={task.assignee} onChange={onAssign} />
      <div className="t-due-wrap" draggable={false}>
        <DueField taskRef={`p:${projectId}:${task.id}`} due={task.due} />
      </div>
      <button className="rm" draggable={false} title="Move to trash" onClick={onRemove}>
        🗑
      </button>
    </div>
  );
}

function AddTaskRow({ onAdd }: { onAdd: (task: Task) => void }) {
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [quick, setQuick] = useState('');
  const [due, setDue] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    onAdd({ id: uid(), text: trimmed, done: false, due: due || null, assignee });
    setText('');
    setQuick('');
    setDue('');
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
    </div>
  );
}
