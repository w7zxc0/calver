'use client';

import { useState } from 'react';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function DepartmentsBlock() {
  const { state, update } = useApp();
  const [newName, setNewName] = useState('');

  const rename = (index: number, name: string) =>
    update((draft) => {
      if (draft.departments[index]) draft.departments[index].name = name;
    });

  const remove = (index: number) => {
    if (state.departments.length <= 1) {
      window.alert('You need at least one department.');
      return;
    }
    const dept = state.departments[index];
    const affected = state.members.filter((m) => m.department === dept.id).length;
    const msg = affected
      ? `Delete "${dept.name}"? ${affected} member(s) will move to the first remaining department.`
      : `Delete "${dept.name}"?`;
    if (!window.confirm(msg)) return;
    update((draft) => {
      draft.departments.splice(index, 1);
      const fallback = draft.departments[0].id;
      draft.members.forEach((m) => { if (m.department === dept.id) m.department = fallback; });
    });
  };

  const add = () => {
    const name = newName.trim();
    if (name === '') return;
    update((draft) => { draft.departments.push({ id: uid(), name }); });
    setNewName('');
  };

  return (
    <div className="manage-block">
      <h2>Departments</h2>
      {state.departments.map((d, i) => (
        <div className="editor-row" key={d.id}>
          <input type="text" value={d.name} onChange={(e) => rename(i, e.target.value)} />
          <button className="rm" title="Delete department" onClick={() => remove(i)}>🗑</button>
        </div>
      ))}
      <div className="add-row">
        <input
          type="text"
          placeholder="Add a department"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
      <div className="manage-note">Groups team members above.</div>
    </div>
  );
}
