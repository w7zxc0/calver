'use client';

import { useState, type ReactNode } from 'react';
import { DEFAULT_LABELS } from '@/lib/labels';
import { useApp } from '@/components/AppProvider';
import { EditableText } from '@/components/ui/EditableText';
import { OverflowMenu, type MenuItem } from '@/components/ui/OverflowMenu';

/** A titled block on the Manage screen, with the same rename affordance as a panel. */
export function ManageBlock({
  labelKey, count, extraItems = [], note, children,
}: {
  labelKey: string;
  count?: number;
  extraItems?: (MenuItem | 'separator')[];
  note?: ReactNode;
  children: ReactNode;
}) {
  const { label, setLabel, resetLabel } = useApp();
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="manage-block">
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
        <OverflowMenu
          title="Block options"
          items={[
            ...extraItems,
            ...(extraItems.length ? (['separator'] as const) : []),
            { label: 'Rename', onSelect: () => setRenaming(true) },
            {
              label: 'Reset name',
              onSelect: () => resetLabel(labelKey),
              disabled: label(labelKey) === DEFAULT_LABELS[labelKey],
            },
          ]}
        />
      </h2>
      {children}
      {note && <div className="manage-note">{note}</div>}
    </div>
  );
}

/** One editable row inside a manage block: swatch, name, and a ⋯ menu. */
export function EditorRow({
  color, onColor, name, onRename, menuItems, children,
}: {
  color?: string;
  onColor?: (value: string) => void;
  name: string;
  onRename: (next: string) => void;
  menuItems: (MenuItem | 'separator')[];
  children?: ReactNode;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="editor-row">
      {color !== undefined && onColor && (
        <input type="color" value={color} onChange={(e) => onColor(e.target.value)} />
      )}
      <span className="editor-name">
        <EditableText
          value={name}
          onCommit={onRename}
          editing={renaming}
          onEditingChange={setRenaming}
        />
      </span>
      {children}
      <OverflowMenu
        title="Options"
        items={[{ label: 'Rename', onSelect: () => setRenaming(true) }, ...menuItems]}
      />
    </div>
  );
}
