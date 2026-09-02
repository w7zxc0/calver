'use client';

import { useState } from 'react';
import { moveInList } from '@/lib/mutations';
import type { Status } from '@/lib/types';
import { randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditorRow, ManageBlock } from './ManageBlock';

export function StatusesBlock() {
  const { state, update, label } = useApp();
  const [color, setColor] = useState(() => randomHex());
  const [name, setName] = useState('');

  const editStatus = (id: string, fn: (s: Status) => void) =>
    update((draft) => {
      const s = draft.statuses.find((x) => x.id === id);
      if (s) fn(s);
    });

  const remove = (id: string) => {
    if (state.statuses.length <= 1) {
      window.alert(`You need at least one ${label('term.status').toLowerCase()}.`);
      return;
    }
    const affected = state.projects.filter((p) => p.status === id).length;
    const msg = affected
      ? `Delete this ${label('term.status').toLowerCase()}? ${affected} project(s) using it will move to the first remaining one.`
      : `Delete this ${label('term.status').toLowerCase()}?`;
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
    <ManageBlock
      labelKey="block.statuses"
      count={state.statuses.length}
      note={`Order sets the sort order in ${label('tab.projects')}. A completed-type ${label('term.status').toLowerCase()} tints its cards and sinks them to the bottom.`}
    >
      {state.statuses.map((s, i) => (
        <EditorRow
          key={s.id}
          color={s.color}
          onColor={(next) => editStatus(s.id, (x) => { x.color = next; })}
          name={s.name}
          onRename={(next) => editStatus(s.id, (x) => { x.name = next; })}
          menuItems={[
            {
              label: 'Completed-type',
              checked: s.terminal,
              onSelect: () => editStatus(s.id, (x) => { x.terminal = !x.terminal; }),
            },
            { label: 'Random colour', onSelect: () => editStatus(s.id, (x) => { x.color = randomHex(); }) },
            {
              label: 'Move up',
              disabled: i === 0,
              onSelect: () => update((draft) => moveInList(draft.statuses, i, -1)),
            },
            {
              label: 'Move down',
              disabled: i === state.statuses.length - 1,
              onSelect: () => update((draft) => moveInList(draft.statuses, i, 1)),
            },
            'separator',
            { label: 'Delete', onSelect: () => remove(s.id), danger: true },
          ]}
        >
          <span className="editor-hint">
            {state.projects.filter((p) => p.status === s.id).length} in use
            {s.terminal ? ' · completed-type' : ''}
          </span>
        </EditorRow>
      ))}

      <div className="add-row">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="text"
          placeholder={`Add a ${label('term.status').toLowerCase()}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
    </ManageBlock>
  );
}
