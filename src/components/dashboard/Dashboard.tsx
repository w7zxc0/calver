'use client';

import { SPLITS } from '@/lib/labels';
import { useApp } from '@/components/AppProvider';
import { SplitPane } from '@/components/ui/SplitPane';
import { DuePanel } from './DuePanel';
import { FollowUpPanel } from './FollowUpPanel';
import { LowVolumePanel } from './LowVolumePanel';
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
        splitId={SPLITS.dashMiddle}
        left={<LowVolumePanel />}
        right={<WorkloadPanel />}
        soloLeft={isHidden('panel.workload')}
        soloRight={isHidden('panel.lowVolume')}
      />
      {!isHidden('panel.projects') && (
        <div className="split-solo">
          <ProjectsOverviewPanel />
        </div>
      )}
    </>
  );
}
