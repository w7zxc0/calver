'use client';

import { useState } from 'react';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { ProjectCard } from './ProjectCard';

export function ProjectsView() {
  const { state, update } = useApp();
  const [search, setSearch] = useState('');

  const rankOf = (id: string) => {
    const i = state.statuses.findIndex((s) => s.id === id);
    return i < 0 ? 999 : i;
  };

  const query = search.trim().toLowerCase();
  const visible = state.projects
    .slice()
    .sort((a, b) => rankOf(a.status) - rankOf(b.status))
    .filter((p) => !query || p.name.toLowerCase().includes(query));

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

  return (
    <>
      <div className="add-row" style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="manage-note" style={{ margin: '-6px 0 14px' }}>
        Drag a task by its ⠿ handle and drop it onto another project card to move it there.
      </div>

      <NewProjectBox />

      {visible.map((p) => (
        <ProjectCard key={p.id} project={p} onDropTask={moveTask} />
      ))}
    </>
  );
}

function NewProjectBox() {
  const { state, update } = useApp();
  const defaultStatus =
    state.statuses.find((s) => s.name === 'Active')?.id || state.statuses[0]?.id || '';
  const [name, setName] = useState('');
  const [status, setStatus] = useState(defaultStatus);

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    update((draft) => {
      draft.projects.push({
        id: uid(), name: trimmed, owner: 'Usman', status, notes: '', tasks: [], open: true,
      });
    });
    setName('');
  };

  return (
    <div className="new-project-box">
      <div className="row">
        <input
          type="text"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {state.statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button className="btn" type="button" onClick={add}>Add project</button>
      </div>
    </div>
  );
}
