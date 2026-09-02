'use client';

import { fmtDate } from '@/lib/date';
import { restoreTrashItem } from '@/lib/mutations';
import { trashLabel, trashTypeLabel } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { ManageBlock } from './ManageBlock';

export function TrashBlock() {
  const { state, update, label } = useApp();

  const restore = (id: string) => update((draft) => restoreTrashItem(draft, id));

  const purge = (id: string) => {
    if (!window.confirm('Delete this permanently? This cannot be undone.')) return;
    update((draft) => { draft.trash = draft.trash.filter((x) => x.id !== id); });
  };

  return (
    <ManageBlock
      labelKey="block.trash"
      count={state.trash.length}
      extraItems={[
        {
          label: 'Restore everything',
          disabled: state.trash.length === 0,
          onSelect: () =>
            update((draft) => {
              draft.trash.slice().forEach((item) => restoreTrashItem(draft, item.id));
            }),
        },
        {
          label: 'Empty trash',
          danger: true,
          disabled: state.trash.length === 0,
          onSelect: () => {
            if (!window.confirm(`Permanently delete ${state.trash.length} item(s)?`)) return;
            update((draft) => { draft.trash = []; });
          },
        },
      ]}
    >
      {state.trash.length === 0 && (
        <div className="manage-note" style={{ marginTop: 0 }}>
          Empty. Anything you delete shows up here so you can bring it back.
        </div>
      )}
      {state.trash
        .slice()
        .reverse()
        .map((item) => (
          <div className="due-row" key={item.id}>
            <div className="txt">
              <div className="name">{trashLabel(item)}</div>
              <div className="sub">
                {trashTypeLabel(item, label)} &middot; deleted {fmtDate(item.deletedAt)}
              </div>
            </div>
            <div className="tags" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <button
                className="btn"
                style={{ padding: '5px 10px', fontSize: 11 }}
                onClick={() => restore(item.id)}
              >
                Restore
              </button>
              <OverflowMenu
                items={[
                  { label: 'Restore', onSelect: () => restore(item.id) },
                  'separator',
                  { label: 'Delete forever', onSelect: () => purge(item.id), danger: true },
                ]}
              />
            </div>
          </div>
        ))}
    </ManageBlock>
  );
}
