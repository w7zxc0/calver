'use client';

import { bucketByGroup } from '@/lib/selectors';
import type { FlatTask, Group } from '@/lib/types';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { DashboardTaskRow } from './DashboardTaskRow';

/**
 * Tasks for one window, split into their project's group when grouping is on.
 * A task inherits the group of the project it belongs to, so grouped projects
 * bring their tasks with them.
 */
export function TaskList({ tasks }: { tasks: FlatTask[] }) {
  const { state, prefs } = useApp();

  if (!prefs.groupProjects || state.groups.length === 0) {
    return <>{tasks.map((t) => <DashboardTaskRow key={t.ref} task={t} />)}</>;
  }

  const buckets = bucketByGroup(state, tasks, (t) => t.groupId);

  return (
    <>
      {buckets.map((bucket) => (
        <div className="group-block" key={bucket.group?.id ?? '__ungrouped__'}>
          <GroupHeading group={bucket.group} count={bucket.items.length} />
          {bucket.items.map((t) => <DashboardTaskRow key={t.ref} task={t} />)}
        </div>
      ))}
    </>
  );
}

export function GroupHeading({ group, count }: { group: Group | null; count: number }) {
  const { label } = useApp();
  const color = group?.color || 'var(--ink-faint)';

  return (
    <div className="group-head" style={{ borderLeftColor: color }}>
      <span className="group-dot" style={{ background: color }} />
      <span className="group-name" style={{ color: group?.color || 'var(--ink-soft)' }}>
        {group ? group.name : `No ${label('term.group').toLowerCase()}`}
      </span>
      <span
        className="count"
        style={group?.color ? { background: hexA(group.color, 0.16), color: group.color } : undefined}
      >
        {count}
      </span>
    </div>
  );
}
