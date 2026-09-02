'use client';

import { DuePanel } from './DuePanel';
import { FollowUpPanel } from './FollowUpPanel';
import { ProjectsOverviewPanel } from './ProjectsOverviewPanel';
import { StatsBar } from './StatsBar';
import { WorkloadPanel } from './WorkloadPanel';

export function Dashboard() {
  return (
    <>
      <StatsBar />
      <div className="dash-grid">
        <DuePanel />
        <FollowUpPanel />
      </div>
      <div className="dash-grid" style={{ marginTop: 16 }}>
        <WorkloadPanel />
        <ProjectsOverviewPanel />
      </div>
    </>
  );
}
