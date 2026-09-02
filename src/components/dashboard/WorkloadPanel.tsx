'use client';

import { getMember, workloadRows } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';

export function WorkloadPanel() {
  const { state } = useApp();
  const rows = workloadRows(state);
  const max = rows[0]?.count || 1;

  return (
    <div className="panel">
      <h2>
        Workload <span className="count">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <div className="empty">No assignments yet.</div>
      ) : (
        rows.map((r) => {
          const m = getMember(state, r.id);
          const color = m && m.color ? m.color : 'var(--accent)';
          return (
            <div className="wl-row" key={r.id}>
              <div className="wl-name">{m ? m.name : 'Unknown'}</div>
              <div className="wl-bar-wrap">
                <div
                  className="wl-bar"
                  style={{ width: `${Math.max(6, Math.round((r.count / max) * 100))}%`, background: color }}
                />
              </div>
              <div className="wl-count mono">{r.count}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
