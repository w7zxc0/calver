'use client';

import { useState } from 'react';
import { fmtDate, todayISO } from '@/lib/date';
import { trashPush } from '@/lib/mutations';
import type { FollowUp, FollowUpStatus } from '@/lib/types';
import { uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { ProjectSelect, RecipientSelect } from '@/components/ui/Selects';

const NEXT_STATUS: Record<FollowUpStatus, FollowUpStatus> = {
  Pending: 'Asked',
  Asked: 'Answered',
  Answered: 'Pending',
};

export function FollowUpPanel() {
  const { state, update, label } = useApp();

  // Unanswered first, answered pushed to the bottom.
  const ordered = state.adminQueue
    .filter((q) => q.status !== 'Answered')
    .concat(state.adminQueue.filter((q) => q.status === 'Answered'));

  const edit = (id: string, fn: (q: FollowUp) => void) =>
    update((draft) => {
      const q = draft.adminQueue.find((x) => x.id === id);
      if (q) fn(q);
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
      <PanelHeader labelKey="panel.followUp" count={ordered.length} hideKey="panel.followUp" />
      {ordered.length ? (
        ordered.map((q) => (
          <FollowUpRow key={q.id} item={q} onEdit={edit} onRemove={remove} />
        ))
      ) : (
        <div className="empty">No {label('term.followUp').toLowerCase()}s queued.</div>
      )}
      <div className="panel-add-row">
        <AddFollowUpRow />
      </div>
    </div>
  );
}

function FollowUpRow({
  item, onEdit, onRemove,
}: {
  item: FollowUp;
  onEdit: (id: string, fn: (q: FollowUp) => void) => void;
  onRemove: (id: string) => void;
}) {
  const { label } = useApp();
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="aq-row">
      <div className="body">
        <div className="q">
          <EditableText
            value={item.question}
            onCommit={(next) => onEdit(item.id, (q) => { q.question = next; })}
            editing={renaming}
            onEditingChange={setRenaming}
            multiline
          />
        </div>
        <div className="link">
          {item.project ? item.project : label('term.general')} &middot; added {fmtDate(item.added)}
        </div>
      </div>
      <div className="right">
        <RecipientSelect
          title={`Who this ${label('term.followUp').toLowerCase()} is for`}
          value={item.recipient}
          onChange={(v) => onEdit(item.id, (q) => { q.recipient = v; })}
        />
        <button
          type="button"
          className={`aq-status aqs-${item.status}`}
          onClick={() => onEdit(item.id, (q) => { q.status = NEXT_STATUS[q.status]; })}
        >
          {item.status}
        </button>
      </div>
      <OverflowMenu
        title={`${label('term.followUp')} options`}
        items={[
          { label: 'Edit question', onSelect: () => setRenaming(true) },
          { label: 'Mark as Pending', onSelect: () => onEdit(item.id, (q) => { q.status = 'Pending'; }) },
          { label: 'Mark as Asked', onSelect: () => onEdit(item.id, (q) => { q.status = 'Asked'; }) },
          { label: 'Mark as Answered', onSelect: () => onEdit(item.id, (q) => { q.status = 'Answered'; }) },
          'separator',
          { label: 'Move to trash', onSelect: () => onRemove(item.id), danger: true },
        ]}
      />
    </div>
  );
}

function AddFollowUpRow() {
  const { update, label } = useApp();
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
        placeholder={label('placeholder.newFollowUp')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <ProjectSelect value={projectId} onChange={setProjectId} />
      <RecipientSelect className="" value={recipient} onChange={setRecipient} />
      <button type="button" onClick={add}>{label('action.addFollowUp')}</button>
    </div>
  );
}
