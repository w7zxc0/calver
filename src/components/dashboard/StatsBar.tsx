'use client';

import { dashboardStats } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';

export function StatsBar() {
  const { state } = useApp();
  const s = dashboardStats(state);

  const cells: { num: number; label: string; warn?: boolean }[] = [
    { num: s.activeProjects, label: 'active projects' },
    { num: s.overdue, label: 'overdue', warn: s.overdue > 0 },
    { num: s.unassigned, label: 'unassigned' },
    { num: s.pendingFollowups, label: 'follow-ups' },
    { num: s.total, label: 'total tasks' },
    { num: s.completed, label: 'completed' },
  ];

  return (
    <div className="stats-bar">
      {cells.map((c) => (
        <div key={c.label} className={`stat${c.warn ? ' stat-warn' : ''}`}>
          <span className="stat-num">{c.num}</span>
          <span className="stat-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
