'use client';

import { groupTasks, type TaskBucket } from '@/lib/selectors';
import type { FlatTask, TaskGrouping } from '@/lib/types';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';
import { type MenuItem } from '@/components/ui/OverflowMenu';
import { DashboardTaskRow } from './DashboardTaskRow';

/**
 * The rows of a dashboard task window, split into headed sections when a
 * grouping is switched on.
 */
export function TaskList({ tasks }: { tasks: FlatTask[] }) {
  const { state, prefs, label } = useApp();

  const buckets = groupTasks(state, tasks, prefs.taskGrouping, {
    myself: label('term.myself'),
    unassigned: label('term.unassigned'),
    status: label('term.status'),
  });

  if (prefs.taskGrouping === 'none') {
    return <>{tasks.map((t) => <DashboardTaskRow key={t.ref} task={t} />)}</>;
  }

  return (
    <>
      {buckets.map((bucket) => (
        <div className="group-block" key={bucket.key}>
          <BucketHeading bucket={bucket} />
          {bucket.items.map((t) => <DashboardTaskRow key={t.ref} task={t} />)}
        </div>
      ))}
    </>
  );
}

function BucketHeading({ bucket }: { bucket: TaskBucket }) {
  const color = bucket.color || 'var(--ink-faint)';
  return (
    <div className="group-head" style={{ borderLeftColor: color }}>
      <span className="group-dot" style={{ background: color }} />
      <span className="group-name" style={{ color: bucket.color || 'var(--ink-soft)' }}>
        {bucket.name}
      </span>
      <span
        className="count"
        style={bucket.color ? { background: hexA(bucket.color, 0.16), color: bucket.color } : undefined}
      >
        {bucket.items.length}
      </span>
    </div>
  );
}

/**
 * The grouping choices for a task window's ⋯ menu. Both dashboard task windows
 * share one setting, so they stay arranged the same way.
 */
export function groupingMenuItems(
  current: TaskGrouping,
  onPick: (mode: TaskGrouping) => void,
  label: (key: string) => string,
): MenuItem[] {
  const options: { mode: TaskGrouping; text: string }[] = [
    { mode: 'none', text: 'No grouping' },
    { mode: 'status', text: `Group by ${label('term.status').toLowerCase()}` },
    { mode: 'assignee', text: `Group by ${label('term.assignee').toLowerCase()}` },
  ];
  return options.map((o) => ({
    label: o.text,
    checked: current === o.mode,
    onSelect: () => onPick(o.mode),
  }));
}
