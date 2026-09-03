'use client';

import { useState } from 'react';
import { daysUntil } from '@/lib/date';
import { allTasksFlat, findTaskByRef } from '@/lib/selectors';
import { newTask } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { MemberSelect, ProjectSelect } from '@/components/ui/Selects';
import { DashboardTaskRow } from './DashboardTaskRow';

/**
 * Everything tagged as low volume, kept out of the main due list so small
 * routine work does not crowd out the rest of the board.
 */
export function LowVolumePanel() {
  const { state, prefs, update, setPref, label } = useApp();

  const listed = allTasksFlat(state, prefs.showSubtasksOnDashboard)
    .filter((t) => t.lowVolume)
    .filter((t) => (prefs.showCompletedInDue ? true : !t.done))
    .sort((a, b) => {
      const dueA = a.due === null ? Number.MAX_SAFE_INTEGER : (daysUntil(a.due) as number);
      const dueB = b.due === null ? Number.MAX_SAFE_INTEGER : (daysUntil(b.due) as number);
      return dueA - dueB;
    });

  const clearAll = () =>
    update((draft) => {
      listed.forEach((t) => {
        const handle = findTaskByRef(draft, t.ref);
        if (handle) handle.task.lowVolume = false;
      });
    });

  return (
    <div className="panel">
      <PanelHeader
        labelKey="panel.lowVolume"
        count={listed.length}
        hideKey="panel.lowVolume"
        extraItems={[
          {
            label: `Also list these in ${label('panel.due')}`,
            checked: prefs.showLowVolumeInDue,
            onSelect: () => setPref('showLowVolumeInDue', !prefs.showLowVolumeInDue),
          },
          {
            label: 'Clear every tag',
            danger: true,
            disabled: listed.length === 0,
            onSelect: clearAll,
          },
        ]}
      />
      {listed.length ? (
        listed.map((t) => <DashboardTaskRow key={t.ref} task={t} />)
      ) : (
        <div className="empty">
          Nothing tagged yet. Use a {label('term.task').toLowerCase()}&apos;s ⋯ menu to tag it as{' '}
          {label('term.lowVolume').toLowerCase()}.
        </div>
      )}
      <div className="panel-add-row">
        <AddLowVolumeRow />
      </div>
    </div>
  );
}

function AddLowVolumeRow() {
  const { state, update, label } = useApp();
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? '');

  const add = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    update((draft) => {
      const task = newTask({ text: trimmed, assignee, lowVolume: true });
      const p = draft.projects.find((x) => x.id === projectId);
      if (p) p.tasks.push(task);
      else draft.generalTasks.push(task);
    });
    setText('');
  };

  return (
    <div className="add-row">
      <input
        type="text"
        placeholder={`New ${label('term.lowVolume').toLowerCase()} ${label('term.task').toLowerCase()}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <MemberSelect className="" value={assignee} onChange={setAssignee} />
      <ProjectSelect value={projectId} onChange={setProjectId} />
      <button type="button" onClick={add}>{label('action.addTask')}</button>
    </div>
  );
}
