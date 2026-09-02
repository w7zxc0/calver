'use client';

import { useState } from 'react';
import { DEFAULT_LABELS, LABEL_GROUPS } from '@/lib/labels';
import { useApp } from '@/components/AppProvider';
import { ManageBlock } from './ManageBlock';

/** Every fixed string in the interface, in one place. */
export function LabelsBlock() {
  const { prefs, label, setLabel, resetLabel, update } = useApp();
  const [filter, setFilter] = useState('');

  const query = filter.trim().toLowerCase();
  const customCount = Object.keys(prefs.labels).filter(
    (k) => prefs.labels[k] && prefs.labels[k] !== DEFAULT_LABELS[k],
  ).length;

  return (
    <ManageBlock
      labelKey="manage.labels"
      count={customCount}
      extraItems={[
        {
          label: 'Reset every label',
          danger: true,
          onSelect: () => {
            if (!window.confirm('Put every name back to its default?')) return;
            update((draft) => { draft.prefs.labels = {}; });
          },
        },
      ]}
      note="Rename anything the interface says. Blank a field to fall back to its default."
    >
      <div className="add-row" style={{ marginBottom: 4 }}>
        <input
          type="text"
          placeholder="Filter labels…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {LABEL_GROUPS.map((group) => {
        const keys = group.keys.filter(
          (k) =>
            !query ||
            k.text.toLowerCase().includes(query) ||
            k.key.toLowerCase().includes(query) ||
            label(k.key).toLowerCase().includes(query),
        );
        if (keys.length === 0) return null;

        return (
          <div key={group.group}>
            <div className="dept-heading">{group.group}</div>
            {keys.map((k) => {
              const current = label(k.key);
              const custom = current !== DEFAULT_LABELS[k.key];
              return (
                <div className="label-row" key={k.key}>
                  <span className="label-row-default">
                    {k.text}
                    {k.hint && <em>{k.hint}</em>}
                  </span>
                  <input
                    type="text"
                    value={current}
                    placeholder={k.text}
                    onChange={(e) => setLabel(k.key, e.target.value)}
                  />
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={!custom}
                    onClick={() => resetLabel(k.key)}
                    title="Back to default"
                  >
                    Reset
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </ManageBlock>
  );
}
