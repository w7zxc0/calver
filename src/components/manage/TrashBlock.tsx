'use client';

import { fmtDate } from '@/lib/date';
import { restoreTrashItem } from '@/lib/mutations';
import { trashLabel, trashTypeLabel } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';

export function TrashBlock() {
  const { state, update } = useApp();

  const restore = (id: string) => update((draft) => restoreTrashItem(draft, id));

  const purge = (id: string) => {
    if (!window.confirm('Delete this permanently? This cannot be undone.')) return;
    update((draft) => { draft.trash = draft.trash.filter((x) => x.id !== id); });
  };

  return (
    <div className="manage-block">
      <h2>
        Trash <span className="count">{state.trash.length}</span>
      </h2>
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
                {trashTypeLabel(item.type)} &middot; deleted {fmtDate(item.deletedAt)}
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
              <button className="rm" title="Delete forever" onClick={() => purge(item.id)}>🗑</button>
            </div>
          </div>
        ))}
    </div>
  );
}
