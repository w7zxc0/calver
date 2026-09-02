'use client';

import { BackupBlock } from './BackupBlock';
import { CompletedBlock } from './CompletedBlock';
import { DepartmentsBlock } from './DepartmentsBlock';
import { MembersBlock } from './MembersBlock';
import { RecipientsBlock } from './RecipientsBlock';
import { LabelColorsBlock, StatusesBlock } from './StatusesBlock';
import { TrashBlock } from './TrashBlock';

export function ManageView() {
  return (
    <>
      <MembersBlock />

      <div className="manage-grid">
        <DepartmentsBlock />
        <RecipientsBlock />
      </div>

      <div className="manage-grid">
        <StatusesBlock />
        <LabelColorsBlock />
      </div>

      <div className="manage-grid">
        <CompletedBlock />
        <TrashBlock />
      </div>

      <BackupBlock />
    </>
  );
}
