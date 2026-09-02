'use client';

import { useState } from 'react';
import { moveInList, reassignAwayFromRecipient, trashPush } from '@/lib/mutations';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditorRow, ManageBlock } from './ManageBlock';

export function RecipientsBlock() {
  const { state, update, label } = useApp();
  const [newName, setNewName] = useState('');

  const rename = (id: string, name: string) =>
    update((draft) => {
      const r = draft.recipients.find((x) => x.id === id);
      if (r) r.name = name;
    });

  const remove = (id: string) => {
    if (state.recipients.length <= 1) {
      window.alert(`You need at least one ${label('term.recipient').toLowerCase()}.`);
      return;
    }
    const r = state.recipients.find((x) => x.id === id);
    if (!r) return;
    if (!window.confirm(`Move "${r.name}" to trash?`)) return;
    update((draft) => {
      const target = draft.recipients.find((x) => x.id === id);
      if (!target) return;
      reassignAwayFromRecipient(draft, id);
      trashPush(draft, { type: 'recipient', payload: target });
      draft.recipients = draft.recipients.filter((x) => x.id !== id);
    });
  };

  const add = () => {
    const name = newName.trim();
    if (name === '') return;
    update((draft) => { draft.recipients.push({ id: uid(), name }); });
    setNewName('');
  };

  return (
    <ManageBlock
      labelKey="block.recipients"
      count={state.recipients.length}
      extraItems={[
        {
          label: 'Add from team members',
          onSelect: () =>
            update((draft) => {
              draft.members.forEach((m) => {
                if (!draft.recipients.some((r) => r.name === m.name)) {
                  draft.recipients.push({ id: uid(), name: m.name });
                }
              });
            }),
        },
      ]}
      note={`Who a ${label('term.followUp').toLowerCase()} can be directed to, on the ${label('tab.dashboard')}.`}
    >
      {state.recipients.map((r, i) => (
        <EditorRow
          key={r.id}
          name={r.name}
          onRename={(next) => rename(r.id, next)}
          menuItems={[
            {
              label: 'Move up',
              disabled: i === 0,
              onSelect: () => update((draft) => moveInList(draft.recipients, i, -1)),
            },
            {
              label: 'Move down',
              disabled: i === state.recipients.length - 1,
              onSelect: () => update((draft) => moveInList(draft.recipients, i, 1)),
            },
            'separator',
            { label: 'Move to trash', onSelect: () => remove(r.id), danger: true },
          ]}
        >
          <span className="editor-hint">
            {state.adminQueue.filter((q) => q.recipient === r.id).length} open
          </span>
        </EditorRow>
      ))}

      <div className="add-row">
        <input
          type="text"
          placeholder={`Add a ${label('term.recipient').toLowerCase()}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
    </ManageBlock>
  );
}
