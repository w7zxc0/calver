'use client';

import { useState, type ReactNode } from 'react';
import { DEFAULT_LABELS } from '@/lib/labels';
import { useApp } from '@/components/AppProvider';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu, type MenuItem } from '@/components/ui/OverflowMenu';

interface Props {
  /** Label key this heading renames. */
  labelKey: string;
  count?: number;
  /** Extra entries added above Rename in the ⋯ menu. */
  extraItems?: (MenuItem | 'separator')[];
  /** Set when the panel can be switched off from its own menu. */
  hideKey?: string;
  children?: ReactNode;
}

/** The heading strip on every window: name, count, and its ⋯ menu. */
export function PanelHeader({ labelKey, count, extraItems = [], hideKey, children }: Props) {
  const { label, setLabel, resetLabel, toggleHidden } = useApp();
  const [renaming, setRenaming] = useState(false);
  const isCustom = label(labelKey) !== DEFAULT_LABELS[labelKey];

  const items: (MenuItem | 'separator')[] = [
    ...extraItems,
    ...(extraItems.length ? (['separator'] as const) : []),
    { label: 'Rename', onSelect: () => setRenaming(true) },
    { label: 'Reset name', onSelect: () => resetLabel(labelKey), disabled: !isCustom },
  ];
  if (hideKey) {
    items.push('separator', { label: 'Hide this window', onSelect: () => toggleHidden(hideKey) });
  }

  return (
    <h2>
      <span className="panel-title">
        <EditableText
          value={label(labelKey)}
          onCommit={(next) => setLabel(labelKey, next)}
          editing={renaming}
          onEditingChange={setRenaming}
        />
        {count !== undefined && <span className="count">{count}</span>}
      </span>
      <span className="panel-tools">
        {children}
        <OverflowMenu items={items} title="Window options" />
      </span>
    </h2>
  );
}
