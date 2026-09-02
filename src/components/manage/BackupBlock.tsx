'use client';

import { useRef } from 'react';
import { todayISO } from '@/lib/date';
import { migrate } from '@/lib/seed';
import { useApp } from '@/components/AppProvider';

export function BackupBlock() {
  const { state, replaceState } = useApp();
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

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        replaceState(migrate(JSON.parse(String(reader.result))));
        window.alert('Data imported.');
      } catch {
        window.alert('Could not read that file. Make sure it is a Calver export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="manage-block">
      <h2>Backup</h2>
      <div className="manage-note" style={{ marginTop: 0 }}>
        Export a copy of everything, or restore from a file you saved earlier.
      </div>
      <div className="add-row">
        <button className="btn" type="button" onClick={exportData}>Export data</button>
        <button className="btn" type="button" onClick={() => fileInput.current?.click()}>
          Import data
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
    </div>
  );
}
