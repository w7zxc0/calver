'use client';

import { useState } from 'react';
import { getStatus } from '@/lib/selectors';
import type { Project, Status } from '@/lib/types';
import { hexA, randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { ProjectCard } from './ProjectCard';

const PROJECT_DRAG_TYPE = 'application/x-calver-project';

export function ProjectsView() {
  const { state, prefs, update, setPref, label } = useApp();
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const matches = (p: Project) => !query || p.name.toLowerCase().includes(query);

  const moveTask = (srcPid: string, taskId: string, destPid: string) => {
    if (srcPid === destPid) return;
    update((draft) => {
      const src = draft.projects.find((x) => x.id === srcPid);
      const dest = draft.projects.find((x) => x.id === destPid);
      if (!src || !dest) return;
      const idx = src.tasks.findIndex((x) => x.id === taskId);
      if (idx < 0) return;
      const [task] = src.tasks.splice(idx, 1);
      dest.tasks.push(task);
      dest.open = true;
    });
  };

  const moveProjectToStatus = (projectId: string, statusId: string) =>
    update((draft) => {
      const p = draft.projects.find((x) => x.id === projectId);
      if (p) p.status = statusId;
    });

  const setAllOpen = (open: boolean) =>
    update((draft) => { draft.projects.forEach((p) => { p.open = open; }); });

  const visible = state.projects.filter(matches);
  const kanban = prefs.projectsView === 'kanban';

  return (
    <>
      <div className="toolbar">
        <input
          type="text"
          className="toolbar-search"
          placeholder={label('placeholder.searchProjects')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="ghost-btn" onClick={() => setAllOpen(true)}>Expand all</button>
        <button type="button" className="ghost-btn" onClick={() => setAllOpen(false)}>Collapse all</button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setPref('showCompletedTasks', !prefs.showCompletedTasks)}
        >
          {prefs.showCompletedTasks ? 'Hide completed' : 'Show completed'}
        </button>
        <span className="toolbar-menu">
          <OverflowMenu
            title="View options"
            items={[
              { label: 'Kanban rows', checked: kanban, onSelect: () => setPref('projectsView', 'kanban') },
              { label: 'Plain list', checked: !kanban, onSelect: () => setPref('projectsView', 'list') },
              'separator',
              ...[2, 3, 4].map((n) => ({
                label: `${n} per row`,
                checked: prefs.kanbanColumns === n,
                disabled: !kanban,
                onSelect: () => setPref('kanbanColumns', n),
              })),
              'separator',
              {
                label: 'Show completed tasks',
                checked: prefs.showCompletedTasks,
                onSelect: () => setPref('showCompletedTasks', !prefs.showCompletedTasks),
              },
              {
                label: 'Colour stripes',
                checked: prefs.projectStripes,
                onSelect: () => setPref('projectStripes', !prefs.projectStripes),
              },
            ]}
          />
        </span>
      </div>

      <NewProjectBox />

      {visible.length === 0 ? (
        <div className="panel"><div className="empty">Nothing matches that search.</div></div>
      ) : kanban ? (
        <div className="kanban">
          {state.statuses.map((status) => (
            <StatusBand
              key={status.id}
              status={status}
              projects={visible.filter((p) => p.status === status.id)}
              columns={prefs.kanbanColumns}
              onDropTask={moveTask}
              onDropProject={moveProjectToStatus}
            />
          ))}
          <UnsortedBand
            projects={visible.filter((p) => !getStatus(state, p.status))}
            columns={prefs.kanbanColumns}
            onDropTask={moveTask}
          />
        </div>
      ) : (
        visible
          .slice()
          .sort((a, b) => rankOf(state.statuses, a.status) - rankOf(state.statuses, b.status))
          .map((p) => <ProjectCard key={p.id} project={p} onDropTask={moveTask} />)
      )}
    </>
  );
}

function rankOf(statuses: Status[], id: string): number {
  const i = statuses.findIndex((s) => s.id === id);
  return i < 0 ? 999 : i;
}

/**
 * One horizontal band per status, with its projects laid out a few to a row.
 * Dropping a project card on the band moves it into that status.
 */
function StatusBand({
  status, projects, columns, onDropTask, onDropProject,
}: {
  status: Status;
  projects: Project[];
  columns: number;
  onDropTask: (srcPid: string, taskId: string, destPid: string) => void;
  onDropProject: (projectId: string, statusId: string) => void;
}) {
  const { update, label } = useApp();
  const [dragOver, setDragOver] = useState(false);

  const addProject = () =>
    update((draft) => {
      draft.projects.push({
        id: uid(),
        name: `${label('term.project')} ${draft.projects.length + 1}`,
        owner: '',
        status: status.id,
        notes: '',
        tasks: [],
        open: true,
        color: randomHex(),
      });
    });

  return (
    <section
      className={`kanban-band${dragOver ? ' drag-over' : ''}`}
      style={{ '--band-accent': status.color } as React.CSSProperties}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        const data = e.dataTransfer.getData(PROJECT_DRAG_TYPE);
        if (!data) return;
        e.preventDefault();
        setDragOver(false);
        onDropProject(data, status.id);
      }}
    >
      <header className="kanban-band-head">
        <span className="kanban-band-name" style={{ color: status.color }}>
          <span className="kanban-dot" style={{ background: status.color }} />
          {status.name}
        </span>
        <span className="count" style={{ background: hexA(status.color, 0.16), color: status.color }}>
          {projects.length}
        </span>
        <button type="button" className="ghost-btn kanban-add" onClick={addProject}>
          + {label('term.project')}
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="kanban-empty">Drop a {label('term.project').toLowerCase()} here.</div>
      ) : (
        <div className="kanban-row" style={{ '--kanban-cols': columns } as React.CSSProperties}>
          {projects.map((p) => (
            <DraggableProject key={p.id} project={p} onDropTask={onDropTask} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Projects whose status has been deleted still need somewhere to live. */
function UnsortedBand({
  projects, columns, onDropTask,
}: {
  projects: Project[];
  columns: number;
  onDropTask: (srcPid: string, taskId: string, destPid: string) => void;
}) {
  if (projects.length === 0) return null;
  return (
    <section className="kanban-band">
      <header className="kanban-band-head">
        <span className="kanban-band-name">Unsorted</span>
        <span className="count">{projects.length}</span>
      </header>
      <div className="kanban-row" style={{ '--kanban-cols': columns } as React.CSSProperties}>
        {projects.map((p) => (
          <DraggableProject key={p.id} project={p} onDropTask={onDropTask} />
        ))}
      </div>
    </section>
  );
}

function DraggableProject({
  project, onDropTask,
}: {
  project: Project;
  onDropTask: (srcPid: string, taskId: string, destPid: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`kanban-cell${dragging ? ' dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        // A task drag starts on the row and bubbles through here; leave it alone.
        if ((e.target as HTMLElement).closest('.task-row')) return;
        e.dataTransfer.setData(PROJECT_DRAG_TYPE, project.id);
        e.dataTransfer.setData('text/plain', project.name);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
    >
      <ProjectCard project={project} onDropTask={onDropTask} compact />
    </div>
  );
}

function NewProjectBox() {
  const { state, update, label } = useApp();
  const [name, setName] = useState('');
  const [status, setStatus] = useState(state.statuses[0]?.id ?? '');
  const [color, setColor] = useState(() => randomHex());

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    update((draft) => {
      draft.projects.push({
        id: uid(), name: trimmed, owner: '', status, notes: '', tasks: [], open: true, color,
      });
    });
    setName('');
    setColor(randomHex());
  };

  return (
    <div className="new-project-box">
      <div className="row">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Card colour" />
        <input
          type="text"
          placeholder={label('placeholder.newProject')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {state.statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button className="btn" type="button" onClick={add}>{label('action.addProject')}</button>
      </div>
    </div>
  );
}
