'use client';

import { useState } from 'react';
import type { AuthUser, SystemSummary, ViewId } from '@/lib/types';
import { OverflowMenu } from '@/components/ui/OverflowMenu';

const VIEWS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'projects', label: 'Projects', icon: '▤' },
  { id: 'manage', label: 'Manage', icon: '⚙' },
];

interface Props {
  user: AuthUser;
  systems: SystemSummary[];
  currentSystemId: string | null;
  view: ViewId;
  open: boolean;
  onSelectSystem: (id: string) => void;
  onSelectView: (view: ViewId) => void;
  onCreateSystem: () => void;
  onRenameSystem: (id: string) => void;
  onDeleteSystem: (id: string) => void;
  onLeaveSystem: (id: string) => void;
  onSignOut: () => void;
  onClose: () => void;
}

/** Left-hand navigation: the systems this account can open, then the views. */
export function Sidebar({
  user, systems, currentSystemId, view, open,
  onSelectSystem, onSelectView, onCreateSystem, onRenameSystem, onDeleteSystem, onLeaveSystem,
  onSignOut, onClose,
}: Props) {
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const shown = systems.filter((s) => !query || s.name.toLowerCase().includes(query));

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-head">
        <span className="wordmark">Calver</span>
        <button type="button" className="sidebar-close" onClick={onClose} title="Close menu">×</button>
      </div>

      <nav className="side-views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`side-view${view === v.id ? ' active' : ''}`}
            onClick={() => onSelectView(v.id)}
          >
            <span className="side-icon" aria-hidden>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </nav>

      <div className="side-section">
        <div className="side-section-head">
          <span>Systems</span>
          <button type="button" className="side-add" title="New system" onClick={onCreateSystem}>+</button>
        </div>

        {systems.length > 6 && (
          <input
            type="text"
            className="side-filter"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        )}

        <div className="side-systems">
          {shown.length === 0 && <div className="side-empty">No systems yet.</div>}
          {shown.map((s) => (
            <div
              key={s.id}
              className={`side-system${s.id === currentSystemId ? ' active' : ''}`}
            >
              <button type="button" className="side-system-main" onClick={() => onSelectSystem(s.id)}>
                <span className="side-system-name">{s.name}</span>
                <span className="side-system-meta">
                  {s.role === 'owner' ? 'Owner' : `Shared by ${s.ownerUsername ?? 'someone'}`}
                  {s.memberCount > 1 && ` · ${s.memberCount} people`}
                </span>
              </button>
              <OverflowMenu
                title="System options"
                items={[
                  { label: 'Open', onSelect: () => onSelectSystem(s.id) },
                  { label: 'Rename', onSelect: () => onRenameSystem(s.id), disabled: s.role !== 'owner' },
                  'separator',
                  s.role === 'owner'
                    ? { label: 'Delete system', onSelect: () => onDeleteSystem(s.id), danger: true }
                    : { label: 'Leave system', onSelect: () => onLeaveSystem(s.id), danger: true },
                ]}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="side-foot">
        <span className="side-user" title={user.username}>
          <span className="side-avatar" aria-hidden>{user.username.slice(0, 1).toUpperCase()}</span>
          {user.username}
        </span>
        <button type="button" className="ghost-btn side-signout" onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
