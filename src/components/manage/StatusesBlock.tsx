'use client';

import { useState } from 'react';
import { moveInList } from '@/lib/mutations';
import type { Status } from '@/lib/types';
import { randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function StatusesBlock() {
  const { state, update } = useApp();
  const [color, setColor] = useState(() => randomHex());
  const [name, setName] = useState('');

  const editStatus = (id: string, fn: (s: Status) => void) =>
    update((draft) => {
      const s = draft.statuses.find((x) => x.id === id);
      if (s) fn(s);
    });

  const move = (id: string, delta: number) =>
    update((draft) => {
      moveInList(draft.statuses, draft.statuses.findIndex((x) => x.id === id), delta);
    });

  const remove = (id: string) => {
    if (state.statuses.length <= 1) {
      window.alert('You need at least one status.');
      return;
    }
    const affected = state.projects.filter((p) => p.status === id).length;
    const msg = affected
      ? `Delete this status? ${affected} project(s) using it will move to the first remaining status.`
      : 'Delete this status?';
    if (!window.confirm(msg)) return;
    update((draft) => {
      draft.statuses = draft.statuses.filter((x) => x.id !== id);
      const fallback = draft.statuses[0].id;
      draft.projects.forEach((p) => { if (p.status === id) p.status = fallback; });
    });
  };

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    update((draft) => { draft.statuses.push({ id: uid(), name: trimmed, color, terminal: false }); });
    setName('');
    setColor(randomHex());
  };

  return (
    <div className="manage-block">
      <h2>Project Statuses</h2>
      {state.statuses.map((s, i) => (
        <div className="editor-row" key={s.id}>
          <input
            type="color"
            value={s.color}
            onChange={(e) => editStatus(s.id, (x) => { x.color = e.target.value; })}
          />
          <input
            type="text"
            value={s.name}
            onChange={(e) => editStatus(s.id, (x) => { x.name = e.target.value; })}
          />
          <label>
            <input
              type="checkbox"
              checked={s.terminal}
              onChange={(e) => editStatus(s.id, (x) => { x.terminal = e.target.checked; })}
            />{' '}
            completed-type
          </label>
          <button className="rm" disabled={i === 0} title="Move up" onClick={() => move(s.id, -1)}>↑</button>
          <button
            className="rm"
            disabled={i === state.statuses.length - 1}
            title="Move down"
            onClick={() => move(s.id, 1)}
          >
            ↓
          </button>
          <button className="rm" title="Delete status" onClick={() => remove(s.id)}>🗑</button>
        </div>
      ))}
      <div className="add-row">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="text"
          placeholder="Add a status"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
      <div className="manage-note">
        Order sets sort order in Projects. &quot;Completed-type&quot; gives the tinted, sunk-to-bottom treatment.
      </div>
    </div>
  );
}

export function LabelColorsBlock() {
  const { state, update } = useApp();

  return (
    <div className="manage-block">
      <h2>Due List Label Colors</h2>
      <div className="editor-row">
        <input
          type="color"
          value={state.uiColors.project}
          onChange={(e) => {
            const v = e.target.value;
            update((draft) => { draft.uiColors.project = v; });
          }}
        />
        <span style={{ flex: 1, fontSize: '12.5px', color: 'var(--ink-soft)' }}>Project label color</span>
      </div>
      <div className="editor-row">
        <input
          type="color"
          value={state.uiColors.general}
          onChange={(e) => {
            const v = e.target.value;
            update((draft) => { draft.uiColors.general = v; });
          }}
        />
        <span style={{ flex: 1, fontSize: '12.5px', color: 'var(--ink-soft)' }}>General task label color</span>
      </div>
      <div className="manage-note">Colors used on the little pills next to due tasks.</div>
    </div>
  );
}
