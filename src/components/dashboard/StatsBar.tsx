'use client';

import { useState } from 'react';
import { DEFAULT_LABELS } from '@/lib/labels';
import { dashboardStats } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

/**
 * Board-wide numbers only. Anything that counts the contents of one window is
 * shown on that window's header instead.
 */
export function StatsBar() {
  const { state, isHidden } = useApp();
  const s = dashboardStats(state);

  const cells = [
    { key: 'stat.activeProjects', num: s.activeProjects },
    { key: 'stat.overdue', num: s.overdue, warn: s.overdue > 0 },
    { key: 'stat.unassigned', num: s.unassigned },
  ].filter((c) => !isHidden(c.key));

  if (cells.length === 0) return null;

  return (
    <div className="stats-bar">
      {cells.map((c) => (
        <Stat key={c.key} labelKey={c.key} num={c.num} warn={c.warn} />
      ))}
    </div>
  );
}

function Stat({ labelKey, num, warn }: { labelKey: string; num: number; warn?: boolean }) {
  const { label, setLabel, resetLabel, toggleHidden } = useApp();
  const [renaming, setRenaming] = useState(false);

  return (
    <div className={`stat${warn ? ' stat-warn' : ''}`}>
      <span className="stat-num">{num}</span>
      <span className="stat-label">
        <EditableText
          value={label(labelKey)}
          onCommit={(next) => setLabel(labelKey, next)}
          editing={renaming}
          onEditingChange={setRenaming}
        />
      </span>
      <span className="stat-menu">
        <OverflowMenu
          title="Count options"
          items={[
            { label: 'Rename', onSelect: () => setRenaming(true) },
            {
              label: 'Reset name',
              onSelect: () => resetLabel(labelKey),
              disabled: label(labelKey) === DEFAULT_LABELS[labelKey],
            },
            'separator',
            { label: 'Hide this count', onSelect: () => toggleHidden(labelKey) },
          ]}
        />
      </span>
    </div>
  );
}
