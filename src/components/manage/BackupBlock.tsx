'use client';

import { useRef } from 'react';
import { todayISO } from '@/lib/date';
import { freshState, migrate } from '@/lib/seed';
import { useApp } from '@/components/AppProvider';
import { ManageBlock } from './ManageBlock';

export function BackupBlock() {
  const { state, replaceState, update } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calver-management-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportSettings = () => {
    const payload = { prefs: state.prefs, uiColors: state.uiColors, statuses: state.statuses };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calver-theme-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // A settings-only file carries prefs but no projects.
        if (parsed && parsed.prefs && !parsed.projects) {
          update((draft) => {
            draft.prefs = migrate({ ...draft, prefs: parsed.prefs }).prefs;
            if (parsed.uiColors) draft.uiColors = parsed.uiColors;
          });
          window.alert('Settings imported.');
          return;
        }
        replaceState(migrate(parsed));
        window.alert('Data imported.');
      } catch {
        window.alert('Could not read that file. Make sure it is a Calver export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <ManageBlock
      labelKey="block.backup"
      extraItems={[
        {
          label: 'Start over with sample data',
          danger: true,
          onSelect: () => {
            if (!window.confirm('Replace everything with a fresh starter board?')) return;
            replaceState(freshState());
          },
        },
      ]}
      note="Export a copy of everything, share just your theme and wording, or restore from a file you saved earlier."
    >
      <div className="add-row">
        <button className="btn" type="button" onClick={exportData}>Export everything</button>
        <button className="btn" type="button" onClick={exportSettings}>Export theme only</button>
        <button className="btn" type="button" onClick={() => fileInput.current?.click()}>
          Import file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importData(file);
            e.target.value = '';
          }}
        />
      </div>
    </ManageBlock>
  );
}
