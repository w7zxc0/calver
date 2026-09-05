'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchMembers, removeMember, shareSystem } from '@/lib/api';
import type { SystemMember } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { ManageBlock } from './ManageBlock';

/**
 * Sharing adds someone to this same system rather than copying it, so both
 * accounts read and write one board and each sees the other's changes.
 */
export function SharingBlock() {
  const { systemId, role } = useApp();
  const [members, setMembers] = useState<SystemMember[] | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchMembers(systemId);
      setMembers(res.members);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load who has access.');
    }
  }, [systemId]);

  useEffect(() => { void load(); }, [load]);

  const share = async () => {
    const name = username.trim();
    if (name === '') return;
    setBusy(true);
    setError(null);
    try {
      const res = await shareSystem(systemId, name);
      setMembers(res.members);
      setUsername('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not share this system.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (member: SystemMember) => {
    if (!window.confirm(`Remove ${member.username}'s access to this system?`)) return;
    try {
      await removeMember(systemId, member.userId);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not remove that person.');
    }
  };

  return (
    <ManageBlock
      labelKey="block.sharing"
      count={members?.length}
      note="Everyone listed opens this same system. A change one person makes shows up for the others within a few seconds."
    >
      {members === null ? (
        <div className="manage-note" style={{ marginTop: 0 }}>Loading…</div>
      ) : (
        members.map((m) => (
          <div className="editor-row" key={m.userId}>
            <span className="side-avatar" aria-hidden>{m.username.slice(0, 1).toUpperCase()}</span>
            <span className="editor-name">{m.username}</span>
            <span className="editor-hint">{m.role === 'owner' ? 'Owner' : 'Editor'}</span>
            {m.role !== 'owner' && (
              <OverflowMenu
                title="Access options"
                items={[
                  {
                    label: 'Remove access',
                    danger: true,
                    disabled: role !== 'owner',
                    onSelect: () => void revoke(m),
                  },
                ]}
              />
            )}
          </div>
        ))
      )}

      {role === 'owner' ? (
        <>
          <div className="add-row" style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="Username to share with"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void share(); }}
            />
            <button type="button" disabled={busy} onClick={() => void share()}>
              {busy ? 'Sharing…' : 'Share'}
            </button>
          </div>
          {error && <div className="manage-note" style={{ color: 'var(--red)' }}>{error}</div>}
        </>
      ) : (
        <div className="manage-note">
          This system belongs to someone else. Only its owner can change who has access.
        </div>
      )}
    </ManageBlock>
  );
}
