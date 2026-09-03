'use client';

import { useState } from 'react';
import { fmtDate, daysUntil, resolveQuickDate } from '@/lib/date';
import { trashPush } from '@/lib/mutations';
import { getStatus, projectProgress, subtasksOf } from '@/lib/selectors';
import type { Project, Task } from '@/lib/types';
import { clone, hexA, newTask, randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { MemberSelect, QuickDateSelect, StatusSelect } from '@/components/ui/Selects';
import { TASK_DRAG_TYPE, TaskRow } from './TaskRow';

interface Props {
  project: Project;
  /** Called when a task dragged from another project is dropped on this card. */
  onDropTask: (sourceProjectId: string, taskId: string, destProjectId: string) => void;
  /** Kanban cards sit in a status band and lose their own status picker. */
  compact?: boolean;
}

export function ProjectCard({ project: p, onDropTask, compact = false }: Props) {
  const { state, prefs, update, label } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editingNotes, setEditingNotes] = useState(Boolean(p.notes));

  const st = getStatus(state, p.status);
  const progress = projectProgress(p);
  const openTasks = progress.total - progress.done;
  const nextDue = p.tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => (daysUntil(a.due) as number) - (daysUntil(b.due) as number))[0];
  const accent = p.color || (st ? st.color : 'var(--ink-faint)');

  const visibleTasks = prefs.showCompletedTasks ? p.tasks : p.tasks.filter((t) => !t.done);
  const hiddenTasks = p.tasks.length - visibleTasks.length;

  /** Edits to a project always leave it expanded. */
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
    if (!window.confirm(`Move this ${label('term.project').toLowerCase()} and all its tasks to trash?`)) return;
    update((draft) => {
      const proj = draft.projects.find((x) => x.id === p.id);
      if (!proj) return;
      trashPush(draft, { type: 'project', payload: proj });
      draft.projects = draft.projects.filter((x) => x.id !== p.id);
    });
  };

  const duplicateProject = () =>
    update((draft) => {
      const index = draft.projects.findIndex((x) => x.id === p.id);
      if (index < 0) return;
      const copy: Project = { ...clone(draft.projects[index]), id: uid(), name: `${p.name} copy`, open: true };
      copy.tasks = copy.tasks.map((t) => ({
        ...t,
        id: uid(),
        subtasks: subtasksOf(t).map((sub) => ({ ...sub, id: uid() })),
      }));
      draft.projects.splice(index + 1, 0, copy);
    });

  const moveProject = (delta: number) =>
    update((draft) => {
      const i = draft.projects.findIndex((x) => x.id === p.id);
      const target = i + delta;
      if (i < 0 || target < 0 || target >= draft.projects.length) return;
      [draft.projects[i], draft.projects[target]] = [draft.projects[target], draft.projects[i]];
    });

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
      className={[
        'proj-card',
        compact ? 'proj-card-compact' : '',
        st?.terminal ? 'tint-done' : '',
        dragOver ? 'drag-over' : '',
        prefs.projectStripes ? 'striped' : '',
        p.open ? 'is-open' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--proj-accent': accent } as React.CSSProperties}
      onDragOver={(e) => {
        // Only task drags land on a card; project drags belong to the band.
        if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        const data = e.dataTransfer.getData(TASK_DRAG_TYPE);
        if (!data) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const [srcPid, tid] = data.split(':');
        onDropTask(srcPid, tid, p.id);
      }}
    >
      <div className="proj-head" onClick={toggleOpen}>
        <div className="left">
          <span className="chevron">{p.open ? '▾' : '▸'}</span>
          <span className="proj-swatch" style={{ background: accent }} />
          <div className="proj-headings">
            <div className="proj-name">
              <EditableText
                value={p.name}
                onCommit={(next) => editProject((proj) => { proj.name = next; })}
                editing={renaming}
                onEditingChange={setRenaming}
              />
            </div>
            <div className="proj-meta">
              {openTasks} open {label('term.task').toLowerCase()}{openTasks === 1 ? '' : 's'}
              {nextDue ? ` · next: ${fmtDate(nextDue.due)}` : ''}
            </div>
          </div>
        </div>
        <div className="proj-actions" onClick={(e) => e.stopPropagation()}>
          {!compact && (
            <StatusSelect
              className="status-select"
              style={{
                background: st ? hexA(st.color, 0.16) : 'transparent',
                color: st ? st.color : 'var(--ink)',
              }}
              value={p.status}
              onChange={(v) => editProject((proj) => { proj.status = v; })}
            />
          )}
          <OverflowMenu
            title={`${label('term.project')} options`}
            header={
              <label className="menu-color">
                <span>Colour</span>
                <input
                  type="color"
                  value={p.color || '#8B909B'}
                  onChange={(e) => {
                    const color = e.target.value;
                    editProject((proj) => { proj.color = color; });
                  }}
                />
              </label>
            }
            items={[
              { label: 'Rename', onSelect: () => setRenaming(true) },
              { label: 'Random colour', onSelect: () => editProject((proj) => { proj.color = randomHex(); }) },
              { label: editingNotes ? 'Hide notes' : 'Add notes', onSelect: () => setEditingNotes((v) => !v) },
              'separator',
              ...state.statuses.map((s) => ({
                label: `Move to ${s.name}`,
                checked: s.id === p.status,
                onSelect: () => editProject((proj) => { proj.status = s.id; }),
              })),
              'separator' as const,
              { label: 'Duplicate', onSelect: duplicateProject },
              { label: 'Move up', onSelect: () => moveProject(-1) },
              { label: 'Move down', onSelect: () => moveProject(1) },
              'separator' as const,
              { label: 'Move to trash', onSelect: removeProject, danger: true },
            ]}
          />
        </div>
      </div>

      <div className={`proj-body${p.open ? ' open' : ''}`}>
        {visibleTasks.map((t) => (
          <TaskRow
            key={t.id}
            taskRef={`p:${p.id}:${t.id}`}
            task={t}
            dragId={`${p.id}:${t.id}`}
            onEdit={(fn) =>
              editProject((proj) => {
                const target = proj.tasks.find((x) => x.id === t.id);
                if (target) fn(target);
              })
            }
            onRemove={() => removeTask(t.id)}
            onAddSubtask={(sub) =>
              editProject((proj) => {
                const target = proj.tasks.find((x) => x.id === t.id);
                if (target) target.subtasks = [...subtasksOf(target), sub];
              })
            }
          />
        ))}

        {visibleTasks.length === 0 && (
          <div className="proj-empty">
            No open {label('term.task').toLowerCase()}s.
          </div>
        )}

        {hiddenTasks > 0 && (
          <div className="subtask-hidden-note">
            {hiddenTasks} completed {label('term.task').toLowerCase()}
            {hiddenTasks === 1 ? '' : 's'} hidden
          </div>
        )}

        <AddTaskRow onAdd={(task) => editProject((proj) => { proj.tasks.push(task); })} />

        {editingNotes && (
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
        )}
      </div>
    </div>
  );
}

function AddTaskRow({ onAdd }: { onAdd: (task: Task) => void }) {
  const { label } = useApp();
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [quick, setQuick] = useState('');
  const [due, setDue] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    onAdd(newTask({ text: trimmed, due: due || null, assignee }));
    setText('');
    setQuick('');
    setDue('');
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
