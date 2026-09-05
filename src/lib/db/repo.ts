import type { PoolClient } from 'pg';
import { DEFAULT_UI_COLORS } from '@/lib/constants';
import type {
  AppState, Department, FollowUp, FollowUpStatus, Group, Member, Project, Recipient, Status, Task,
  TrashItem,
} from '@/lib/types';
import { getPool } from './pool';
import { ensureSchema } from './schema';

interface SystemRow {
  ui_project_color: string;
  ui_general_color: string;
  preferences: unknown;
}
interface NamedRow { id: string; name: string }
interface GroupRow { id: string; name: string; color: string }
interface MemberRow { id: string; name: string; color: string; department_id: string | null }
interface StatusRow { id: string; name: string; color: string; terminal: boolean }
interface ProjectRow {
  id: string; name: string; owner: string; status_id: string | null; group_id: string | null;
  notes: string; color: string; is_open: boolean;
}
interface TaskRow {
  id: string; project_id: string | null; parent_task_id: string | null; title: string;
  done: boolean; due: string | null; assignee: string; low_volume: boolean;
}
interface FollowUpRow {
  id: string; question: string; project_name: string; status: string; answer: string;
  recipient_id: string; added: string | null;
}
interface TrashRow {
  id: string; kind: string; payload: unknown; extra: unknown; deleted_at: string | null;
}

/** Reads one system's whole board into the shape the client works with. */
export async function loadState(systemId: string): Promise<AppState | null> {
  await ensureSchema();
  const pool = getPool();

  const system = await pool.query<SystemRow>(
    'SELECT ui_project_color, ui_general_color, preferences FROM systems WHERE id = $1',
    [systemId],
  );
  if (system.rowCount === 0) return null;

  const args = [systemId];
  const [departments, groups, members, statuses, recipients, projects, tasks, followUps, trash] =
    await Promise.all([
      pool.query<NamedRow>('SELECT id, name FROM departments WHERE system_id = $1 ORDER BY position', args),
      pool.query<GroupRow>('SELECT id, name, color FROM groups WHERE system_id = $1 ORDER BY position', args),
      pool.query<MemberRow>('SELECT id, name, color, department_id FROM members WHERE system_id = $1 ORDER BY position', args),
      pool.query<StatusRow>('SELECT id, name, color, terminal FROM statuses WHERE system_id = $1 ORDER BY position', args),
      pool.query<NamedRow>('SELECT id, name FROM recipients WHERE system_id = $1 ORDER BY position', args),
      pool.query<ProjectRow>('SELECT id, name, owner, status_id, group_id, notes, color, is_open FROM projects WHERE system_id = $1 ORDER BY position', args),
      pool.query<TaskRow>('SELECT id, project_id, parent_task_id, title, done, due, assignee, low_volume FROM tasks WHERE system_id = $1 ORDER BY position', args),
      pool.query<FollowUpRow>('SELECT id, question, project_name, status, answer, recipient_id, added FROM follow_ups WHERE system_id = $1 ORDER BY position', args),
      pool.query<TrashRow>('SELECT id, kind, payload, extra, deleted_at FROM trash WHERE system_id = $1 ORDER BY position', args),
    ]);

  const toTask = (r: TaskRow): Task => ({
    id: r.id,
    text: r.title,
    done: r.done,
    due: r.due,
    assignee: r.assignee,
    lowVolume: r.low_volume,
    subtasks: [],
  });

  // Two passes: build every task first, then hang subtasks off their parent.
  const byId = new Map<string, Task>();
  tasks.rows.forEach((r) => byId.set(r.id, toTask(r)));

  const tasksByProject = new Map<string, Task[]>();
  const generalTasks: Task[] = [];
  tasks.rows.forEach((r) => {
    const task = byId.get(r.id);
    if (!task) return;

    if (r.parent_task_id) {
      byId.get(r.parent_task_id)?.subtasks.push(task);
      return;
    }
    if (r.project_id === null) {
      generalTasks.push(task);
      return;
    }
    const list = tasksByProject.get(r.project_id);
    if (list) list.push(task);
    else tasksByProject.set(r.project_id, [task]);
  });

  return {
    departments: departments.rows.map((r): Department => ({ id: r.id, name: r.name })),
    groups: groups.rows.map((r): Group => ({ id: r.id, name: r.name, color: r.color })),
    members: members.rows.map((r): Member => ({
      id: r.id, name: r.name, color: r.color, department: r.department_id,
    })),
    statuses: statuses.rows.map((r): Status => ({
      id: r.id, name: r.name, color: r.color, terminal: r.terminal,
    })),
    recipients: recipients.rows.map((r): Recipient => ({ id: r.id, name: r.name })),
    uiColors: {
      project: system.rows[0].ui_project_color || DEFAULT_UI_COLORS.project,
      general: system.rows[0].ui_general_color || DEFAULT_UI_COLORS.general,
    },
    // Normalised by migrate() once the document is assembled.
    prefs: system.rows[0].preferences as AppState['prefs'],
    projects: projects.rows.map((r): Project => ({
      id: r.id,
      name: r.name,
      owner: r.owner,
      status: r.status_id ?? '',
      group: r.group_id,
      notes: r.notes,
      color: r.color,
      open: r.is_open,
      tasks: tasksByProject.get(r.id) ?? [],
    })),
    generalTasks,
    adminQueue: followUps.rows.map((r): FollowUp => ({
      id: r.id,
      question: r.question,
      project: r.project_name,
      status: r.status as FollowUpStatus,
      answer: r.answer,
      recipient: r.recipient_id,
      added: r.added ?? '',
    })),
    trash: trash.rows.map((r) => ({
      id: r.id,
      type: r.kind,
      payload: r.payload,
      extra: r.extra,
      deletedAt: r.deleted_at ?? '',
    })) as TrashItem[],
  };
}

/**
 * Writes one system's board in a single transaction. The dataset is small and
 * the client always holds the complete document, so a replace keeps ordering
 * and deletions correct without diffing.
 */
export async function saveState(state: AppState, systemId: string): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO systems (id, ui_project_color, ui_general_color, preferences)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET ui_project_color = EXCLUDED.ui_project_color,
             ui_general_color = EXCLUDED.ui_general_color,
             preferences = EXCLUDED.preferences,
             updated_at = now()`,
      [systemId, state.uiColors.project, state.uiColors.general, JSON.stringify(state.prefs)],
    );

    // Children first so the task -> project foreign key stays satisfied.
    for (const table of ['tasks', 'projects', 'follow_ups', 'trash', 'members', 'departments', 'statuses', 'recipients', 'groups']) {
      await client.query(`DELETE FROM ${table} WHERE system_id = $1`, [systemId]);
    }

    await insertRows(client, 'departments', ['system_id', 'id', 'name', 'position'],
      state.departments.map((d, i) => [systemId, d.id, d.name, i]));

    await insertRows(client, 'groups', ['system_id', 'id', 'name', 'color', 'position'],
      state.groups.map((g, i) => [systemId, g.id, g.name, g.color || '', i]));

    await insertRows(client, 'statuses', ['system_id', 'id', 'name', 'color', 'terminal', 'position'],
      state.statuses.map((s, i) => [systemId, s.id, s.name, s.color, s.terminal, i]));

    await insertRows(client, 'recipients', ['system_id', 'id', 'name', 'position'],
      state.recipients.map((r, i) => [systemId, r.id, r.name, i]));

    await insertRows(client, 'members', ['system_id', 'id', 'name', 'color', 'department_id', 'position'],
      state.members.map((m, i) => [systemId, m.id, m.name, m.color, m.department || null, i]));

    await insertRows(client, 'projects',
      ['system_id', 'id', 'name', 'owner', 'status_id', 'group_id', 'notes', 'color', 'is_open', 'position'],
      state.projects.map((p, i) => [
        systemId, p.id, p.name, p.owner || '', p.status || null, p.group || null,
        p.notes || '', p.color || '', !!p.open, i,
      ]));

    // Parents are written before their subtasks so the rows read back in order.
    const taskRows: unknown[][] = [];
    const pushTask = (t: Task, projectId: string | null, parentId: string | null, i: number) => {
      taskRows.push([
        systemId, t.id, projectId, parentId, t.text, !!t.done, t.due || null,
        t.assignee || '', !!t.lowVolume, i,
      ]);
      (Array.isArray(t.subtasks) ? t.subtasks : []).forEach((sub, subIndex) => {
        pushTask(sub, projectId, t.id, subIndex);
      });
    };
    state.projects.forEach((p) => p.tasks.forEach((t, i) => pushTask(t, p.id, null, i)));
    state.generalTasks.forEach((t, i) => pushTask(t, null, null, i));

    await insertRows(client, 'tasks',
      ['system_id', 'id', 'project_id', 'parent_task_id', 'title', 'done', 'due', 'assignee', 'low_volume', 'position'],
      taskRows);

    await insertRows(client, 'follow_ups',
      ['system_id', 'id', 'question', 'project_name', 'status', 'answer', 'recipient_id', 'added', 'position'],
      state.adminQueue.map((q, i) => [
        systemId, q.id, q.question, q.project || '', q.status, q.answer || '', q.recipient || '', q.added || null, i,
      ]));

    await insertRows(client, 'trash',
      ['system_id', 'id', 'kind', 'payload', 'extra', 'deleted_at', 'position'],
      state.trash.map((t, i) => [
        systemId, t.id, t.type, JSON.stringify(t.payload), t.extra ? JSON.stringify(t.extra) : null,
        t.deletedAt || null, i,
      ]));

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Multi-row INSERT, chunked so the parameter limit is never in play. */
async function insertRows(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: unknown[][],
): Promise<void> {
  if (rows.length === 0) return;
  const chunkSize = Math.max(1, Math.floor(60000 / columns.length));

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const params: unknown[] = [];
    const tuples = chunk.map(
      (row) => `(${row.map((value) => `$${params.push(value)}`).join(', ')})`,
    );
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}`,
      params,
    );
  }
}
