'use client';

import { useState } from 'react';
import { DEPT_IDS } from '@/lib/constants';
import { reassignAwayFromMember, trashPush } from '@/lib/mutations';
import { membersByDepartment } from '@/lib/selectors';
import type { Member } from '@/lib/types';
import { randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function MembersBlock() {
  const { state, update } = useApp();
  const { groups, orphans } = membersByDepartment(state);

  const editMember = (id: string, fn: (m: Member) => void) =>
    update((draft) => {
      const m = draft.members.find((x) => x.id === id);
      if (m) fn(m);
    });

  const removeMember = (id: string) => {
    const m = state.members.find((x) => x.id === id);
    if (!m) return;
    if (!window.confirm(`Move ${m.name} to trash?`)) return;
    update((draft) => {
      const target = draft.members.find((x) => x.id === id);
      if (!target) return;
      reassignAwayFromMember(draft, id);
      trashPush(draft, { type: 'member', payload: target });
      draft.members = draft.members.filter((x) => x.id !== id);
    });
  };

  const row = (m: Member) => (
    <div className="editor-row" key={m.id}>
      <input
        type="color"
        value={m.color}
        onChange={(e) => editMember(m.id, (x) => { x.color = e.target.value; })}
      />
      <input
        type="text"
        value={m.name}
        onChange={(e) => editMember(m.id, (x) => { x.name = e.target.value; })}
      />
      <select
        value={m.department ?? ''}
        onChange={(e) => editMember(m.id, (x) => { x.department = e.target.value; })}
      >
        {state.departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button className="rm" title="Move to trash" onClick={() => removeMember(m.id)}>🗑</button>
    </div>
  );

  return (
    <div className="manage-block">
      <h2>Team Members</h2>

      {groups.map(({ dept, members }) => (
        <div key={dept.id}>
          <div className="dept-heading">
            {dept.name}
            {dept.id === DEPT_IDS.ops && <span className="me-pin"> + Myself</span>}
          </div>
          {members.length === 0 ? (
            <div className="manage-note" style={{ marginTop: 0 }}>No one here yet.</div>
          ) : (
            members.map(row)
          )}
        </div>
      ))}

      {orphans.length > 0 && (
        <div>
          <div className="dept-heading">Unsorted</div>
          {orphans.map(row)}
        </div>
      )}

      <AddMemberRow />

      <div className="manage-note">
        Rename, recolor, or move anyone between departments — changes apply everywhere instantly.
        &quot;Myself&quot; is a fixed identity kept separate from this list.
      </div>
    </div>
  );
}

function AddMemberRow() {
  const { state, update } = useApp();
  const [color, setColor] = useState(() => randomHex());
  const [name, setName] = useState('');
  const [deptId, setDeptId] = useState(state.departments[0]?.id ?? '');

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    update((draft) => {
      const dept = draft.departments.find((d) => d.id === deptId) || draft.departments[0];
      draft.members.push({ id: uid(), name: trimmed, color, department: dept ? dept.id : null });
    });
    setName('');
    setColor(randomHex());
  };

  return (
    <div className="add-row" style={{ marginTop: 10 }}>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <input
        type="text"
        placeholder="Add a team member"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
        {state.departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button type="button" onClick={add}>Add</button>
    </div>
  );
}
