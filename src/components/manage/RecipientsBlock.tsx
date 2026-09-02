'use client';

import { useState } from 'react';
import { moveInList, reassignAwayFromRecipient, trashPush } from '@/lib/mutations';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function RecipientsBlock() {
  const { state, update } = useApp();
  const [newName, setNewName] = useState('');

  const rename = (id: string, name: string) =>
    update((draft) => {
      const r = draft.recipients.find((x) => x.id === id);
      if (r) r.name = name;
    });

  const move = (id: string, delta: number) =>
    update((draft) => {
      moveInList(draft.recipients, draft.recipients.findIndex((x) => x.id === id), delta);
    });

  const remove = (id: string) => {
    if (state.recipients.length <= 1) {
      window.alert('You need at least one recipient.');
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
    <div className="manage-block">
      <h2>Follow-up Recipients</h2>
      {state.recipients.map((r, i) => (
        <div className="editor-row" key={r.id}>
          <input type="text" value={r.name} onChange={(e) => rename(r.id, e.target.value)} />
          <button className="rm" disabled={i === 0} title="Move up" onClick={() => move(r.id, -1)}>↑</button>
          <button
            className="rm"
            disabled={i === state.recipients.length - 1}
            title="Move down"
            onClick={() => move(r.id, 1)}
          >
            ↓
          </button>
          <button className="rm" title="Move to trash" onClick={() => remove(r.id)}>🗑</button>
        </div>
      ))}
      <div className="add-row">
        <input
          type="text"
          placeholder="Add a recipient"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
      <div className="manage-note">Who a follow-up can be directed to, on the Dashboard.</div>
    </div>
  );
}
