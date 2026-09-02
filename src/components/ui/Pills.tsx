'use client';

import { ME_ID } from '@/lib/constants';
import { dueClass, dueLabelLowkey } from '@/lib/date';
import { getMember } from '@/lib/selectors';
import type { AppState } from '@/lib/types';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function AssigneeLabel({ assignee }: { assignee: string }) {
  const { state } = useApp();
  if (assignee === ME_ID) return <span className="label-pill mine-pill">Myself</span>;
  if (!assignee) return <span className="label-pill unassigned-pill">Unassigned</span>;
  const m = getMember(state, assignee);
  if (!m) return <span className="label-pill unassigned-pill">Unknown</span>;
  return (
    <span className="label-pill" style={{ background: hexA(m.color, 0.16), color: m.color }}>
      {m.name}
    </span>
  );
}

export function ProjectOrGeneralLabel({ projectName }: { projectName: string | null }) {
  const { state } = useApp();
  const colors: AppState['uiColors'] = state.uiColors;
  if (projectName) {
    return (
      <span className="label-pill" style={{ background: hexA(colors.project, 0.16), color: colors.project }}>
        {projectName}
      </span>
    );
  }
  return (
    <span className="label-pill" style={{ background: hexA(colors.general, 0.14), color: colors.general }}>
      General
    </span>
  );
}

export function DueChip({ due }: { due: string | null }) {
  if (!due) return <span className="due-chip none">no due date</span>;
  return <span className={`due-chip ${dueClass(due)}`}>{dueLabelLowkey(due)}</span>;
}
