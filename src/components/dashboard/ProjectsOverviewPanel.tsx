'use client';

import { bucketByGroup, getStatus, projectProgress } from '@/lib/selectors';
import type { Project } from '@/lib/types';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { GroupHeading } from './TaskList';

export function ProjectsOverviewPanel() {
  const { state, prefs, setPref, label } = useApp();
  const grouped = prefs.groupProjects && state.groups.length > 0;
  const buckets = bucketByGroup(state, state.projects, (p) => p.group ?? null);

  return (
    <div className="panel">
      <PanelHeader
        labelKey="panel.projects"
        count={state.projects.length}
        hideKey="panel.projects"
        extraItems={[
          {
            label: `Group by ${label('term.group').toLowerCase()}`,
            checked: prefs.groupProjects,
            onSelect: () => setPref('groupProjects', !prefs.groupProjects),
          },
        ]}
      />
      {state.projects.length === 0 ? (
        <div className="empty">No {label('term.project').toLowerCase()}s yet.</div>
      ) : grouped ? (
        buckets.map((bucket) => (
          <div className="group-block" key={bucket.group?.id ?? '__ungrouped__'}>
            <GroupHeading group={bucket.group} count={bucket.items.length} />
            {bucket.items.map((p) => <ProjectRow key={p.id} project={p} />)}
          </div>
        ))
      ) : (
        state.projects.map((p) => <ProjectRow key={p.id} project={p} />)
      )}
    </div>
  );
}

function ProjectRow({ project: p }: { project: Project }) {
  const { state, label } = useApp();
  const st = getStatus(state, p.status);
  const { total, done, pct } = projectProgress(p);
  const barColor = p.color || (st ? st.color : '#8B909B');

  return (
    <div className="po-row">
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
}
