'use client';

import { useState } from 'react';
import { moveInList, reassignAwayFromMember, trashPush } from '@/lib/mutations';
import { membersByDepartment } from '@/lib/selectors';
import type { Member } from '@/lib/types';
import { randomHex, shuffledPalette, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditorRow, ManageBlock } from './ManageBlock';

export function MembersBlock() {
  const { state, update, label } = useApp();
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

  const duplicateMember = (id: string) =>
    update((draft) => {
      const m = draft.members.find((x) => x.id === id);
      if (!m) return;
      draft.members.push({ ...m, id: uid(), name: `${m.name} copy` });
    });

  const row = (m: Member) => (
    <EditorRow
      key={m.id}
      color={m.color}
      onColor={(color) => editMember(m.id, (x) => { x.color = color; })}
      name={m.name}
      onRename={(next) => editMember(m.id, (x) => { x.name = next; })}
      menuItems={[
        { label: 'Random colour', onSelect: () => editMember(m.id, (x) => { x.color = randomHex(); }) },
        { label: 'Duplicate', onSelect: () => duplicateMember(m.id) },
        {
          label: 'Move up',
          onSelect: () => update((draft) => moveInList(draft.members, draft.members.findIndex((x) => x.id === m.id), -1)),
        },
        {
          label: 'Move down',
          onSelect: () => update((draft) => moveInList(draft.members, draft.members.findIndex((x) => x.id === m.id), 1)),
        },
        'separator',
        { label: 'Move to trash', onSelect: () => removeMember(m.id), danger: true },
      ]}
    >
      <select
        value={m.department ?? ''}
        onChange={(e) => {
          const dept = e.target.value;
          editMember(m.id, (x) => { x.department = dept; });
        }}
      >
        {state.departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
        {m.department && !state.departments.some((d) => d.id === m.department) && (
          <option value={m.department}>Unsorted</option>
        )}
      </select>
    </EditorRow>
  );

  return (
    <ManageBlock
      labelKey="block.members"
      count={state.members.length}
      extraItems={[
        {
          label: 'Recolour everyone',
          onSelect: () =>
            update((draft) => {
              const colors = shuffledPalette(draft.members.length);
              draft.members.forEach((m, i) => { m.color = colors[i]; });
            }),
        },
        {
          label: 'Sort A-Z',
          onSelect: () => update((draft) => draft.members.sort((a, b) => a.name.localeCompare(b.name))),
        },
      ]}
      note={
        <>
          Rename, recolour, or move anyone between {label('term.department').toLowerCase()}s — changes
          apply everywhere instantly. &quot;{label('term.myself')}&quot; is a fixed identity kept
          separate from this list.
        </>
      }
    >
      {groups.map(({ dept, members }) => (
        <div key={dept.id}>
          <div className="dept-heading">{dept.name}</div>
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
    </ManageBlock>
  );
}

function AddMemberRow() {
  const { state, update, label } = useApp();
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
        placeholder={`Add a ${label('term.member').toLowerCase()}`}
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
