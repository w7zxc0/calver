'use client';

import { getStatus } from '@/lib/selectors';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { PanelHeader } from '@/components/ui/PanelHeader';

export function ProjectsOverviewPanel() {
  const { state, label } = useApp();

  return (
    <div className="panel">
      <PanelHeader
        labelKey="panel.projects"
        count={state.projects.length}
        hideKey="panel.projects"
      />
      {state.projects.length === 0 ? (
        <div className="empty">No {label('term.project').toLowerCase()}s yet.</div>
      ) : (
        state.projects.map((p) => {
          const st = getStatus(state, p.status);
          const total = p.tasks.length;
          const done = p.tasks.filter((t) => t.done).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const barColor = p.color || (st ? st.color : '#8B909B');
          return (
            <div className="po-row" key={p.id}>
              <div className="po-top">
                <span className="po-name">
                  <span className="po-dot" style={{ background: p.color || 'var(--ink-faint)' }} />
                  {p.name}
                </span>
                {st && (
                  <span className="label-pill" style={{ background: hexA(st.color, 0.16), color: st.color }}>
                    {st.name}
                  </span>
                )}
              </div>
              <div className="wl-bar-wrap">
                <div className="wl-bar" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <div className="po-sub">
                {done}/{total} {label('term.task').toLowerCase()}{total === 1 ? '' : 's'} complete
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
