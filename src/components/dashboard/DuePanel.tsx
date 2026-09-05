'use client';

import { useState } from 'react';
import { ME_ID } from '@/lib/constants';
import { daysUntil, resolveQuickDate } from '@/lib/date';
import { allTasksFlat } from '@/lib/selectors';
import { newTask } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { MemberSelect, ProjectSelect, QuickDateSelect } from '@/components/ui/Selects';
import { groupingMenuItems, TaskList } from './TaskList';

export function DuePanel() {
  const { state, prefs, update, setPref, label } = useApp();

  // What the window lists is exactly what its count reports.
  const listed = allTasksFlat(state, prefs.showSubtasksOnDashboard)
    .filter((t) => (prefs.showCompletedInDue ? true : !t.done))
    .filter((t) => (prefs.showTasksWithoutDue ? true : Boolean(t.due)))
    .filter((t) => (prefs.showLowVolumeInDue ? true : !t.lowVolume))
    .sort((a, b) => {
      const mineA = a.assignee === ME_ID ? 0 : 1;
      const mineB = b.assignee === ME_ID ? 0 : 1;
      if (mineA !== mineB) return mineA - mineB;
      const dueA = a.due === null ? Number.MAX_SAFE_INTEGER : (daysUntil(a.due) as number);
      const dueB = b.due === null ? Number.MAX_SAFE_INTEGER : (daysUntil(b.due) as number);
      return dueA - dueB;
    });

  return (
    <div className="panel">
      <PanelHeader
        labelKey="panel.due"
        count={listed.length}
        hideKey="panel.due"
        extraItems={[
          {
            label: 'Include tasks with no due date',
            checked: prefs.showTasksWithoutDue,
            onSelect: () => setPref('showTasksWithoutDue', !prefs.showTasksWithoutDue),
          },
          {
            label: 'Include completed tasks',
            checked: prefs.showCompletedInDue,
            onSelect: () => setPref('showCompletedInDue', !prefs.showCompletedInDue),
          },
          {
            label: `Include ${label('term.lowVolume').toLowerCase()} tasks`,
            checked: prefs.showLowVolumeInDue,
            onSelect: () => setPref('showLowVolumeInDue', !prefs.showLowVolumeInDue),
          },
          {
            label: `Include ${label('term.subtask').toLowerCase()}s`,
            checked: prefs.showSubtasksOnDashboard,
            onSelect: () => setPref('showSubtasksOnDashboard', !prefs.showSubtasksOnDashboard),
          },
          'separator',
          ...groupingMenuItems(prefs.taskGrouping, (mode) => setPref('taskGrouping', mode), label),
        ]}
      />
      {listed.length ? (
        <TaskList tasks={listed} />
      ) : (
        <div className="empty">Nothing listed. Add {label('term.task').toLowerCase()} below.</div>
      )}
      <div className="panel-add-row">
        <AddTaskRow />
      </div>
    </div>
  );
}

function AddTaskRow() {
  const { update, label } = useApp();
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [projectId, setProjectId] = useState('');
  const [quick, setQuick] = useState('');
  const [date, setDate] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    update((draft) => {
      const task = newTask({ text: trimmed, due: date || null, assignee });
      const p = draft.projects.find((x) => x.id === projectId);
      if (p) p.tasks.push(task);
      else draft.generalTasks.push(task);
    });
    setText('');
    setQuick('');
    setDate('');
  };

  return (
    <div className="add-row">
      <input
        type="text"
        placeholder={label('placeholder.newTask')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <MemberSelect className="" value={assignee} onChange={setAssignee} />
      <ProjectSelect value={projectId} onChange={setProjectId} />
      <QuickDateSelect
        value={quick}
        onChange={(v) => {
          setQuick(v);
          const resolved = resolveQuickDate(v);
          if (resolved) setDate(resolved);
        }}
      />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button type="button" onClick={add}>{label('action.addTask')}</button>
    </div>
  );
}
