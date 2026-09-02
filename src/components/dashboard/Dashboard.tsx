'use client';

import { SPLITS } from '@/lib/labels';
import { useApp } from '@/components/AppProvider';
import { SplitPane } from '@/components/ui/SplitPane';
import { DuePanel } from './DuePanel';
import { FollowUpPanel } from './FollowUpPanel';
import { ProjectsOverviewPanel } from './ProjectsOverviewPanel';
import { StatsBar } from './StatsBar';
import { WorkloadPanel } from './WorkloadPanel';

export function Dashboard() {
  const { isHidden } = useApp();

  return (
    <>
      <StatsBar />
      <SplitPane
        splitId={SPLITS.dashTop}
        left={<DuePanel />}
        right={<FollowUpPanel />}
        soloLeft={isHidden('panel.followUp')}
        soloRight={isHidden('panel.due')}
      />
      <SplitPane
        splitId={SPLITS.dashBottom}
        left={<WorkloadPanel />}
        right={<ProjectsOverviewPanel />}
        soloLeft={isHidden('panel.projects')}
        soloRight={isHidden('panel.workload')}
      />
    </>
  );
}
