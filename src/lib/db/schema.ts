import type { PoolClient } from 'pg';
import { getPool } from './pool';

/**
 * Every table is keyed by (workspace_id, id) because the seeded departments and
 * statuses carry fixed ids like 'dep_ops' that would otherwise collide between
 * workspaces. Ordering columns keep the list order the UI lets you rearrange.
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (
  id                 text PRIMARY KEY,
  ui_project_color   text NOT NULL,
  ui_general_color   text NOT NULL,
  preferences        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           text NOT NULL,
  name         text NOT NULL,
  position     integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS members (
  workspace_id  text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id            text NOT NULL,
  name          text NOT NULL,
  color         text NOT NULL,
  department_id text,
  position      integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS statuses (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           text NOT NULL,
  name         text NOT NULL,
  color        text NOT NULL,
  terminal     boolean NOT NULL DEFAULT false,
  position     integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS recipients (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           text NOT NULL,
  name         text NOT NULL,
  position     integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS projects (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           text NOT NULL,
  name         text NOT NULL,
  owner        text NOT NULL DEFAULT '',
  status_id    text,
  notes        text NOT NULL DEFAULT '',
  color        text NOT NULL DEFAULT '',
  is_open      boolean NOT NULL DEFAULT false,
  position     integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

-- A NULL project_id marks a general task, i.e. one not attached to a project.
-- A non-NULL parent_task_id marks a subtask of the task it names.
CREATE TABLE IF NOT EXISTS tasks (
  workspace_id   text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id             text NOT NULL,
  project_id     text,
  parent_task_id text,
  title          text NOT NULL,
  done           boolean NOT NULL DEFAULT false,
  due            date,
  assignee       text NOT NULL DEFAULT '',
  low_volume     boolean NOT NULL DEFAULT false,
  position       integer NOT NULL,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follow_ups (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           text NOT NULL,
  question     text NOT NULL,
  project_name text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'Pending',
  answer       text NOT NULL DEFAULT '',
  recipient_id text NOT NULL DEFAULT '',
  added        date,
  position     integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS trash (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           text NOT NULL,
  kind         text NOT NULL,
  payload      jsonb NOT NULL,
  extra        jsonb,
  deleted_at   date,
  position     integer NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

CREATE INDEX IF NOT EXISTS tasks_by_project ON tasks (workspace_id, project_id);

-- Columns added after the first release; safe to run against an existing database.
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE projects   ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '';
ALTER TABLE tasks      ADD COLUMN IF NOT EXISTS parent_task_id text;
ALTER TABLE tasks      ADD COLUMN IF NOT EXISTS low_volume boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS tasks_by_parent ON tasks (workspace_id, parent_task_id);
`;

let ready: Promise<void> | null = null;

/** Creates the schema on first use; subsequent calls reuse the same promise. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const client: PoolClient = await getPool().connect();
      try {
        await client.query(SCHEMA_SQL);
      } finally {
        client.release();
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
