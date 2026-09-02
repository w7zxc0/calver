'use client';

import { useState } from 'react';
import { fmtDate, todayISO } from '@/lib/date';
import { trashPush } from '@/lib/mutations';
import type { FollowUp, FollowUpStatus } from '@/lib/types';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { ProjectSelect, RecipientSelect } from '@/components/ui/Selects';

const NEXT_STATUS: Record<FollowUpStatus, FollowUpStatus> = {
  Pending: 'Asked',
  Asked: 'Answered',
  Answered: 'Pending',
};

export function FollowUpPanel() {
  const { state, update } = useApp();

  // Unanswered first, answered pushed to the bottom.
  const ordered = state.adminQueue
    .filter((q) => q.status !== 'Answered')
    .concat(state.adminQueue.filter((q) => q.status === 'Answered'));
  const pendingCount = state.adminQueue.filter((q) => q.status !== 'Answered').length;

  const cycleStatus = (id: string) =>
    update((draft) => {
      const q = draft.adminQueue.find((x) => x.id === id);
      if (q) q.status = NEXT_STATUS[q.status];
    });

  const setRecipient = (id: string, recipient: string) =>
    update((draft) => {
      const q = draft.adminQueue.find((x) => x.id === id);
      if (q) q.recipient = recipient;
    });

  const remove = (id: string) =>
    update((draft) => {
      const q = draft.adminQueue.find((x) => x.id === id);
      if (!q) return;
      trashPush(draft, { type: 'adminQueue', payload: q });
      draft.adminQueue = draft.adminQueue.filter((x) => x.id !== id);
    });

  return (
    <div className="panel">
      <h2>
        Follow Up <span className="count">{pendingCount}</span>
      </h2>
      {ordered.length ? (
        ordered.map((q) => (
          <FollowUpRow
            key={q.id}
            item={q}
            onCycle={cycleStatus}
            onRecipient={setRecipient}
            onRemove={remove}
          />
        ))
      ) : (
        <div className="empty">No follow-ups queued.</div>
      )}
      <div className="panel-add-row">
        <AddFollowUpRow />
      </div>
    </div>
  );
}

function FollowUpRow({
  item, onCycle, onRecipient, onRemove,
}: {
  item: FollowUp;
  onCycle: (id: string) => void;
  onRecipient: (id: string, recipient: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="aq-row">
      <div className="body">
        <div className="q">{item.question}</div>
        <div className="link">
          {item.project ? item.project : 'General'} &middot; added {fmtDate(item.added)}
        </div>
      </div>
      <div className="right">
        <RecipientSelect
          title="Who this follow-up is for"
          value={item.recipient}
          onChange={(v) => onRecipient(item.id, v)}
        />
        <button type="button" className={`aq-status aqs-${item.status}`} onClick={() => onCycle(item.id)}>
          {item.status}
        </button>
        <button type="button" className="rm" title="Move to trash" onClick={() => onRemove(item.id)}>
          🗑
        </button>
      </div>
    </div>
  );
}

function AddFollowUpRow() {
  const { update } = useApp();
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState('');
  const [recipient, setRecipient] = useState('');

  const add = () => {
    const question = text.trim();
    if (question === '') return;
    update((draft) => {
      const proj = draft.projects.find((x) => x.id === projectId);
      draft.adminQueue.push({
        id: uid(),
        question,
        project: proj ? proj.name : '',
        status: 'Pending',
        answer: '',
        recipient,
        added: todayISO(),
      });
    });
    setText('');
  };

  return (
    <div className="add-row">
      <input
        type="text"
        placeholder="New follow-up question"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <ProjectSelect value={projectId} onChange={setProjectId} />
      <RecipientSelect
        className=""
        title="Who this follow-up is for"
        value={recipient}
        onChange={setRecipient}
      />
      <button type="button" onClick={add}>Add follow-up</button>
    </div>
  );
}
