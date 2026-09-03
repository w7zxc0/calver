'use client';

import { SPLITS, TOGGLEABLE_PARTS } from '@/lib/labels';
import { useApp } from '@/components/AppProvider';
import { ManageBlock } from './ManageBlock';

const SPLIT_ROWS: { id: string; name: string }[] = [
  { id: SPLITS.dashTop, name: 'Dashboard — Due / Follow Up' },
  { id: SPLITS.dashMiddle, name: 'Dashboard — Low Volume / Workload' },
  { id: SPLITS.managePeople, name: 'Manage — People' },
  { id: SPLITS.manageWorkflow, name: 'Manage — Workflow' },
  { id: SPLITS.manageData, name: 'Manage — Data' },
];

export function LayoutBlock() {
  const { prefs, label, isHidden, toggleHidden, setPref, update } = useApp();

  const groups = Array.from(new Set(TOGGLEABLE_PARTS.map((p) => p.where)));

  return (
    <>
      <ManageBlock
        labelKey="manage.layout"
        extraItems={[
          {
            label: 'Show everything',
            onSelect: () => update((draft) => { draft.prefs.hidden = {}; }),
          },
        ]}
        note="Switch off anything you do not use. Hidden windows keep their data — they just stop taking up room."
      >
        {groups.map((where) => (
          <div key={where}>
            <div className="dept-heading">{where}</div>
            {TOGGLEABLE_PARTS.filter((p) => p.where === where).map((part) => (
              <label className="switch-row" key={part.key}>
                <input
                  type="checkbox"
                  checked={!isHidden(part.key)}
                  onChange={() => toggleHidden(part.key)}
                />
                <span>
                  <strong>{label(part.labelKey)}</strong>
                  <em>{isHidden(part.key) ? 'Hidden' : 'Visible'}</em>
                </span>
              </label>
            ))}
          </div>
        ))}
      </ManageBlock>

      <div className="manage-block">
        <h2><span className="panel-title">{label('tab.projects')} view</span></h2>
        <div className="preset-row">
          {(['kanban', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`preset${prefs.projectsView === mode ? ' preset-on' : ''}`}
              onClick={() => setPref('projectsView', mode)}
            >
              {mode === 'kanban' ? 'Kanban rows' : 'Plain list'}
            </button>
          ))}
        </div>
        <div className="slider-row">
          <span className="slider-name">Cards per row</span>
          <input
            type="range"
            min={1}
            max={4}
            value={prefs.kanbanColumns}
            disabled={prefs.projectsView !== 'kanban'}
            onChange={(e) => setPref('kanbanColumns', Number(e.target.value))}
          />
          <span className="slider-value mono">{prefs.kanbanColumns}</span>
        </div>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={prefs.showCompletedTasks}
            onChange={(e) => setPref('showCompletedTasks', e.target.checked)}
          />
          <span>
            <strong>Show completed tasks</strong>
            <em>Off by default; finished work stays folded away on each card</em>
          </span>
        </label>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={prefs.showSubtasksOnDashboard}
            onChange={(e) => setPref('showSubtasksOnDashboard', e.target.checked)}
          />
          <span>
            <strong>List {label('term.subtask').toLowerCase()}s on the {label('tab.dashboard').toLowerCase()}</strong>
            <em>Subtasks appear in the task windows the same way tasks do</em>
          </span>
        </label>
      </div>

      <div className="manage-block">
        <h2><span className="panel-title">Window widths</span></h2>
        {SPLIT_ROWS.map((row) => {
          const ratio = prefs.splits[row.id] ?? 0.5;
          return (
            <div className="slider-row" key={row.id}>
              <span className="slider-name">{row.name}</span>
              <input
                type="range"
                min={20}
                max={80}
                value={Math.round(ratio * 100)}
                onChange={(e) => {
                  const next = Number(e.target.value) / 100;
                  update((draft) => { draft.prefs.splits[row.id] = next; });
                }}
              />
              <span className="slider-value mono">
                {Math.round(ratio * 100)} / {100 - Math.round(ratio * 100)}
              </span>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => update((draft) => { delete draft.prefs.splits[row.id]; })}
              >
                Even
              </button>
            </div>
          );
        })}
        <div className="manage-note">
          You can also drag the divider between any two windows, or double-click it to even them out.
        </div>
      </div>
    </>
  );
}
