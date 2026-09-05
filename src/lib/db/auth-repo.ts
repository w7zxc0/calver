import { createHash, randomBytes } from 'node:crypto';
import { usernameKey } from '@/lib/auth/password';
import { uid } from '@/lib/utils';
import { getPool } from './pool';
import { ensureSchema } from './schema';

export interface UserRecord { id: string; username: string; passwordHash: string }
export interface PublicUser { id: string; username: string }

export type SystemRole = 'owner' | 'editor';

export interface SystemSummary {
  id: string;
  name: string;
  role: SystemRole;
  ownerUsername: string | null;
  memberCount: number;
  updatedAt: string;
}

const SESSION_DAYS = 30;

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  await ensureSchema();
  const res = await getPool().query<{ id: string; username: string; password_hash: string }>(
    'SELECT id, username, password_hash FROM users WHERE username_key = $1',
    [usernameKey(username)],
  );
  const row = res.rows[0];
  return row ? { id: row.id, username: row.username, passwordHash: row.password_hash } : null;
}

export async function createUser(username: string, passwordHash: string): Promise<PublicUser> {
  await ensureSchema();
  const id = uid() + uid();
  await getPool().query(
    'INSERT INTO users (id, username, username_key, password_hash) VALUES ($1, $2, $3, $4)',
    [id, username.trim(), usernameKey(username), passwordHash],
  );
  return { id, username: username.trim() };
}

export async function countUsers(): Promise<number> {
  await ensureSchema();
  const res = await getPool().query<{ n: number }>('SELECT count(*)::int AS n FROM users');
  return res.rows[0]?.n ?? 0;
}

/**
 * A board created before accounts existed has no owner. The very first account
 * adopts those, so an upgraded install keeps the work it already had.
 */
export async function adoptOwnerlessSystems(userId: string): Promise<number> {
  const pool = getPool();
  const res = await pool.query<{ id: string }>(
    'UPDATE systems SET owner_id = $1 WHERE owner_id IS NULL RETURNING id',
    [userId],
  );
  for (const row of res.rows) {
    await pool.query(
      `INSERT INTO system_members (system_id, user_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT (system_id, user_id) DO UPDATE SET role = 'owner'`,
      [row.id, userId],
    );
  }
  return res.rowCount ?? 0;
}

// --- sessions ---------------------------------------------------------------

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Returns the raw token; only its hash is stored. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  await ensureSchema();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await getPool().query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, expiresAt],
  );
  return { token, expiresAt };
}

export async function userForToken(token: string): Promise<PublicUser | null> {
  if (!token) return null;
  await ensureSchema();
  const res = await getPool().query<{ id: string; username: string }>(
    `SELECT u.id, u.username
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return res.rows[0] ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await ensureSchema();
  await getPool().query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

// --- systems ----------------------------------------------------------------

export async function listSystemsForUser(userId: string): Promise<SystemSummary[]> {
  await ensureSchema();
  const res = await getPool().query<{
    id: string; name: string; role: string; owner_username: string | null;
    member_count: number; updated_at: Date;
  }>(
    `SELECT s.id,
            s.name,
            sm.role,
            owner.username AS owner_username,
            (SELECT count(*)::int FROM system_members m WHERE m.system_id = s.id) AS member_count,
            s.updated_at
       FROM system_members sm
       JOIN systems s ON s.id = sm.system_id
       LEFT JOIN users owner ON owner.id = s.owner_id
      WHERE sm.user_id = $1
      ORDER BY s.created_at`,
    [userId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role === 'owner' ? 'owner' : 'editor',
    ownerUsername: r.owner_username,
    memberCount: r.member_count,
    updatedAt: r.updated_at.toISOString(),
  }));
}

/** Null when the user cannot open the system at all. */
export async function roleFor(systemId: string, userId: string): Promise<SystemRole | null> {
  await ensureSchema();
  const res = await getPool().query<{ role: string }>(
    'SELECT role FROM system_members WHERE system_id = $1 AND user_id = $2',
    [systemId, userId],
  );
  const role = res.rows[0]?.role;
  if (!role) return null;
  return role === 'owner' ? 'owner' : 'editor';
}

export async function createSystemRow(name: string, ownerId: string): Promise<string> {
  await ensureSchema();
  const pool = getPool();
  const id = uid() + uid();
  await pool.query(
    `INSERT INTO systems (id, name, owner_id, ui_project_color, ui_general_color)
     VALUES ($1, $2, $3, '#B39CE0', '#8B909B')`,
    [id, name, ownerId],
  );
  await pool.query(
    `INSERT INTO system_members (system_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [id, ownerId],
  );
  return id;
}

export async function renameSystem(systemId: string, name: string): Promise<void> {
  await getPool().query('UPDATE systems SET name = $2, updated_at = now() WHERE id = $1', [systemId, name]);
}

export async function deleteSystem(systemId: string): Promise<void> {
  await getPool().query('DELETE FROM systems WHERE id = $1', [systemId]);
}

export async function systemUpdatedAt(systemId: string): Promise<string | null> {
  const res = await getPool().query<{ updated_at: Date }>(
    'SELECT updated_at FROM systems WHERE id = $1',
    [systemId],
  );
  return res.rows[0]?.updated_at.toISOString() ?? null;
}

export interface SystemMemberRow { userId: string; username: string; role: SystemRole }

export async function listSystemMembers(systemId: string): Promise<SystemMemberRow[]> {
  await ensureSchema();
  const res = await getPool().query<{ user_id: string; username: string; role: string }>(
    `SELECT sm.user_id, u.username, sm.role
       FROM system_members sm
       JOIN users u ON u.id = sm.user_id
      WHERE sm.system_id = $1
      ORDER BY sm.role = 'owner' DESC, u.username`,
    [systemId],
  );
  return res.rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    role: r.role === 'owner' ? 'owner' : 'editor',
  }));
}

export async function addSystemMember(systemId: string, userId: string): Promise<void> {
  await getPool().query(
    `INSERT INTO system_members (system_id, user_id, role) VALUES ($1, $2, 'editor')
     ON CONFLICT (system_id, user_id) DO NOTHING`,
    [systemId, userId],
  );
}

export async function removeSystemMember(systemId: string, userId: string): Promise<void> {
  await getPool().query(
    `DELETE FROM system_members WHERE system_id = $1 AND user_id = $2 AND role <> 'owner'`,
    [systemId, userId],
  );
}
