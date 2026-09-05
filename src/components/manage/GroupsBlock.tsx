'use client';

import { useState } from 'react';
import { moveInList } from '@/lib/mutations';
import type { Group } from '@/lib/types';
import { randomHex, uid } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { EditorRow, ManageBlock } from './ManageBlock';

/** Groups are bands projects are filed under; the board can group by them. */
export function GroupsBlock() {
  const { state, prefs, update, setPref, label } = useApp();
  const [color, setColor] = useState(() => randomHex());
  const [name, setName] = useState('');

  const editGroup = (id: string, fn: (g: Group) => void) =>
    update((draft) => {
      const g = draft.groups.find((x) => x.id === id);
      if (g) fn(g);
    });

  const remove = (id: string) => {
    const group = state.groups.find((g) => g.id === id);
    if (!group) return;
    const affected = state.projects.filter((p) => p.group === id).length;
    const msg = affected
      ? `Delete "${group.name}"? ${affected} project(s) become ungrouped.`
      : `Delete "${group.name}"?`;
    if (!window.confirm(msg)) return;
    update((draft) => {
      draft.groups = draft.groups.filter((g) => g.id !== id);
      draft.projects.forEach((p) => { if (p.group === id) p.group = null; });
    });
  };

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    update((draft) => { draft.groups.push({ id: uid(), name: trimmed, color }); });
    setName('');
    setColor(randomHex());
  };

  return (
    <>
      <ManageBlock
        labelKey="block.groups"
        count={state.groups.length}
        extraItems={[
          {
            label: 'Ungroup every project',
            danger: true,
            disabled: state.projects.every((p) => !p.group),
            onSelect: () => {
              if (!window.confirm('Clear the group on every project?')) return;
              update((draft) => draft.projects.forEach((p) => { p.group = null; }));
            },
          },
        ]}
        note={`Order here sets the order groups appear in on the ${label('tab.dashboard').toLowerCase()} and ${label('tab.projects').toLowerCase()} screens.`}
      >
        {state.groups.length === 0 && (
          <div className="manage-note" style={{ marginTop: 0 }}>
            No {label('term.group').toLowerCase()}s yet. Add one below, then file projects under it.
          </div>
        )}

        {state.groups.map((g, i) => (
          <EditorRow
            key={g.id}
            color={g.color || '#8B909B'}
            onColor={(next) => editGroup(g.id, (x) => { x.color = next; })}
            name={g.name}
            onRename={(next) => editGroup(g.id, (x) => { x.name = next; })}
            menuItems={[
              { label: 'Random colour', onSelect: () => editGroup(g.id, (x) => { x.color = randomHex(); }) },
              {
                label: 'Move up',
                disabled: i === 0,
                onSelect: () => update((draft) => moveInList(draft.groups, i, -1)),
              },
              {
                label: 'Move down',
                disabled: i === state.groups.length - 1,
                onSelect: () => update((draft) => moveInList(draft.groups, i, 1)),
              },
              'separator',
              { label: 'Delete', onSelect: () => remove(g.id), danger: true },
            ]}
          >
            <span className="editor-hint">
              {state.projects.filter((p) => p.group === g.id).length} {label('term.project').toLowerCase()}(s)
            </span>
          </EditorRow>
        ))}

        <div className="add-row">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <input
            type="text"
            placeholder={`Add a ${label('term.group').toLowerCase()}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          />
          <button type="button" onClick={add}>Add</button>
        </div>
      </ManageBlock>

      <div className="manage-block">
        <h2><span className="panel-title">Filing</span></h2>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={prefs.groupProjects}
            onChange={(e) => setPref('groupProjects', e.target.checked)}
          />
          <span>
            <strong>Group the board</strong>
            <em>
              Task windows and the {label('tab.projects').toLowerCase()} screen split into their
              {' '}{label('term.group').toLowerCase()}s, so a group&apos;s projects and their tasks stay together
            </em>
          </span>
        </label>

        <div className="dept-heading">Which group each project is in</div>
        {state.projects.length === 0 && (
          <div className="manage-note" style={{ marginTop: 0 }}>No projects yet.</div>
        )}
        {state.projects.map((p) => (
          <div className="editor-row" key={p.id}>
            <span className="proj-swatch" style={{ background: p.color || 'var(--ink-faint)' }} />
            <span className="editor-name">{p.name}</span>
            <select
              value={p.group ?? ''}
              onChange={(e) => {
                const groupId = e.target.value || null;
                update((draft) => {
                  const target = draft.projects.find((x) => x.id === p.id);
                  if (target) target.group = groupId;
                });
              }}
            >
              <option value="">No {label('term.group').toLowerCase()}</option>
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </>
  );
}
