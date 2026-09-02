'use client';

import { getStatus } from '@/lib/selectors';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function ProjectsOverviewPanel() {
  const { state } = useApp();

  return (
    <div className="panel">
      <h2>
        Projects Overview <span className="count">{state.projects.length}</span>
      </h2>
      {state.projects.length === 0 ? (
        <div className="empty">No projects yet.</div>
      ) : (
        state.projects.map((p) => {
          const st = getStatus(state, p.status);
          const total = p.tasks.length;
          const done = p.tasks.filter((t) => t.done).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const stColor = st ? st.color : '#8B909B';
          return (
            <div className="po-row" key={p.id}>
              <div className="po-top">
                <span className="po-name">{p.name}</span>
                {st && (
                  <span className="label-pill" style={{ background: hexA(stColor, 0.16), color: stColor }}>
                    {st.name}
                  </span>
                )}
              </div>
              <div className="wl-bar-wrap">
                <div className="wl-bar" style={{ width: `${pct}%`, background: stColor }} />
              </div>
              <div className="po-sub">
                {done}/{total} task{total === 1 ? '' : 's'} complete
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
