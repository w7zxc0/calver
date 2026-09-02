'use client';

import { useState } from 'react';
import { randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { ProjectCard } from './ProjectCard';

export function ProjectsView() {
  const { state, prefs, update, setPref, label } = useApp();
  const [search, setSearch] = useState('');
  const [sortByStatus, setSortByStatus] = useState(true);

  const rankOf = (id: string) => {
    const i = state.statuses.findIndex((s) => s.id === id);
    return i < 0 ? 999 : i;
  };

  const query = search.trim().toLowerCase();
  const visible = (sortByStatus
    ? state.projects.slice().sort((a, b) => rankOf(a.status) - rankOf(b.status))
    : state.projects.slice()
  ).filter((p) => !query || p.name.toLowerCase().includes(query));

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

  const setAllOpen = (open: boolean) =>
    update((draft) => { draft.projects.forEach((p) => { p.open = open; }); });

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
        <span className="toolbar-menu">
          <ProjectsViewMenu
            sortByStatus={sortByStatus}
            onToggleSort={() => setSortByStatus((v) => !v)}
            stripes={prefs.projectStripes}
            onToggleStripes={() => setPref('projectStripes', !prefs.projectStripes)}
          />
        </span>
      </div>

      <NewProjectBox />

      {visible.length === 0 ? (
        <div className="panel"><div className="empty">Nothing matches that search.</div></div>
      ) : (
        visible.map((p) => <ProjectCard key={p.id} project={p} onDropTask={moveTask} />)
      )}
    </>
  );
}

function ProjectsViewMenu({
  sortByStatus, onToggleSort, stripes, onToggleStripes,
}: {
  sortByStatus: boolean;
  onToggleSort: () => void;
  stripes: boolean;
  onToggleStripes: () => void;
}) {
  return (
    <OverflowMenu
      title="View options"
      items={[
        { label: 'Sort by status', checked: sortByStatus, onSelect: onToggleSort },
        { label: 'Manual order', checked: !sortByStatus, onSelect: onToggleSort },
        'separator',
        { label: 'Colour stripes', checked: stripes, onSelect: onToggleStripes },
      ]}
    />
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
