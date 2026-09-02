'use client';

import { ME_ID } from '@/lib/constants';
import { dueClass, dueLabelLowkey } from '@/lib/date';
import { getMember } from '@/lib/selectors';
import { hexA } from '@/lib/utils';
import { useApp } from '@/components/AppProvider';

export function AssigneeLabel({ assignee }: { assignee: string }) {
  const { state, label } = useApp();
  if (assignee === ME_ID) return <span className="label-pill mine-pill">{label('term.myself')}</span>;
  if (!assignee) return <span className="label-pill unassigned-pill">{label('term.unassigned')}</span>;
  const m = getMember(state, assignee, label('term.myself'));
  if (!m) return <span className="label-pill unassigned-pill">Unknown</span>;
  return (
    <span className="label-pill" style={{ background: hexA(m.color, 0.16), color: m.color }}>
      {m.name}
    </span>
  );
}

/**
 * The project a task belongs to. When the project has its own accent colour it
 * wins, so the same colour identifies it here and on its card.
 */
export function ProjectOrGeneralLabel({
  projectName, projectColor,
}: {
  projectName: string | null;
  projectColor?: string | null;
}) {
  const { state, label } = useApp();
  const colors = state.uiColors;
  if (projectName) {
    const color = projectColor || colors.project;
    return (
      <span className="label-pill" style={{ background: hexA(color, 0.16), color }}>
        {projectName}
      </span>
    );
  }
  return (
    <span className="label-pill" style={{ background: hexA(colors.general, 0.14), color: colors.general }}>
      {label('term.general')}
    </span>
  );
}

export function DueChip({ due }: { due: string | null }) {
  if (!due) return <span className="due-chip none">no due date</span>;
  return <span className={`due-chip ${dueClass(due)}`}>{dueLabelLowkey(due)}</span>;
}
