'use client';

import { useState } from 'react';
import { SPLITS } from '@/lib/labels';
import type { ManageSection } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { SplitPane } from '@/components/ui/SplitPane';
import { AppearanceBlock } from './AppearanceBlock';
import { BackupBlock } from './BackupBlock';
import { CompletedBlock } from './CompletedBlock';
import { DepartmentsBlock } from './DepartmentsBlock';
import { LabelsBlock } from './LabelsBlock';
import { LayoutBlock } from './LayoutBlock';
import { MembersBlock } from './MembersBlock';
import { RecipientsBlock } from './RecipientsBlock';
import { StatusesBlock } from './StatusesBlock';
import { TrashBlock } from './TrashBlock';

const SECTIONS: { id: ManageSection; labelKey: string; blurb: string }[] = [
  { id: 'people', labelKey: 'manage.people', blurb: 'Who is on the board and how they are grouped.' },
  { id: 'workflow', labelKey: 'manage.workflow', blurb: 'The stages work moves through, and who follow-ups go to.' },
  { id: 'appearance', labelKey: 'manage.appearance', blurb: 'Colours, density, and how cards are marked out.' },
  { id: 'labels', labelKey: 'manage.labels', blurb: 'Rename any wording in the interface.' },
  { id: 'layout', labelKey: 'manage.layout', blurb: 'Show, hide, and resize the windows.' },
  { id: 'data', labelKey: 'manage.data', blurb: 'Completed work, trash, and backups.' },
];

export function ManageView() {
  const { label } = useApp();
  const [section, setSection] = useState<ManageSection>('people');
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  return (
    <>
      <nav className="subtabs">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={section === s.id ? 'active' : undefined}
            onClick={() => setSection(s.id)}
          >
            {label(s.labelKey)}
          </button>
        ))}
      </nav>
      <div className="section-blurb">{current.blurb}</div>

      {section === 'people' && (
        <SplitPane
          splitId={SPLITS.managePeople}
          left={<MembersBlock />}
          right={<DepartmentsBlock />}
        />
      )}

      {section === 'workflow' && (
        <SplitPane
          splitId={SPLITS.manageWorkflow}
          left={<StatusesBlock />}
          right={<RecipientsBlock />}
        />
      )}

      {section === 'appearance' && <AppearanceBlock />}

      {section === 'labels' && <LabelsBlock />}

      {section === 'layout' && <LayoutBlock />}

      {section === 'data' && (
        <>
          <SplitPane
            splitId={SPLITS.manageData}
            left={<CompletedBlock />}
            right={<TrashBlock />}
          />
          <BackupBlock />
        </>
      )}
    </>
  );
}
