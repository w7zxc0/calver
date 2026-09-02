'use client';

import { useState } from 'react';
import { moveInList } from '@/lib/mutations';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditorRow, ManageBlock } from './ManageBlock';

export function DepartmentsBlock() {
  const { state, update, label } = useApp();
  const [newName, setNewName] = useState('');

  const rename = (id: string, name: string) =>
    update((draft) => {
      const d = draft.departments.find((x) => x.id === id);
      if (d) d.name = name;
    });

  const remove = (id: string) => {
    if (state.departments.length <= 1) {
      window.alert(`You need at least one ${label('term.department').toLowerCase()}.`);
      return;
    }
    const dept = state.departments.find((d) => d.id === id);
    if (!dept) return;
    const affected = state.members.filter((m) => m.department === dept.id).length;
    const msg = affected
      ? `Delete "${dept.name}"? ${affected} member(s) will move to the first remaining ${label('term.department').toLowerCase()}.`
      : `Delete "${dept.name}"?`;
    if (!window.confirm(msg)) return;
    update((draft) => {
      draft.departments = draft.departments.filter((d) => d.id !== id);
      const fallback = draft.departments[0].id;
      draft.members.forEach((m) => { if (m.department === id) m.department = fallback; });
    });
  };

  const add = () => {
    const name = newName.trim();
    if (name === '') return;
    update((draft) => { draft.departments.push({ id: uid(), name }); });
    setNewName('');
  };

  return (
    <ManageBlock
      labelKey="block.departments"
      count={state.departments.length}
      extraItems={[
        {
          label: `Add ${label('term.department').toLowerCase()}`,
          onSelect: () =>
            update((draft) => {
              draft.departments.push({ id: uid(), name: `Department ${draft.departments.length + 1}` });
            }),
        },
      ]}
      note={`Groups team members. Order here sets the order they appear in every picker.`}
    >
      {state.departments.map((d, i) => (
        <EditorRow
          key={d.id}
          name={d.name}
          onRename={(next) => rename(d.id, next)}
          menuItems={[
            {
              label: 'Move up',
              disabled: i === 0,
              onSelect: () => update((draft) => moveInList(draft.departments, i, -1)),
            },
            {
              label: 'Move down',
              disabled: i === state.departments.length - 1,
              onSelect: () => update((draft) => moveInList(draft.departments, i, 1)),
            },
            'separator',
            { label: 'Delete', onSelect: () => remove(d.id), danger: true },
          ]}
        >
          <span className="editor-hint">
            {state.members.filter((m) => m.department === d.id).length} member(s)
          </span>
        </EditorRow>
      ))}

      <div className="add-row">
        <input
          type="text"
          placeholder={`Add a ${label('term.department').toLowerCase()}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
    </ManageBlock>
  );
}
