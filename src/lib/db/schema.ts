import type { PoolClient } from 'pg';
import { getPool } from './pool';

/**
 * Runs before the CREATE statements so an existing database is renamed rather
 * than left behind next to a new, empty set of tables.
 */
const MIGRATE_BEFORE_SQL = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'systems') THEN
    ALTER TABLE workspaces RENAME TO systems;
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments','members','statuses','recipients','projects','tasks','follow_ups','trash'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'workspace_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN workspace_id TO system_id', t);
    END IF;
  END LOOP;
END $$;
`;

/**
 * Every board table is keyed by (system_id, id) because seeded records carry
 * fixed ids that would otherwise collide between systems. Ordering columns keep
 * the list order the UI lets you rearrange.
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  username      text NOT NULL,
  username_key  text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS systems (
  id                 text PRIMARY KEY,
  name               text NOT NULL DEFAULT 'System',
  owner_id           text,
  ui_project_color   text NOT NULL,
  ui_general_color   text NOT NULL,
  preferences        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Who can open a system. Sharing is a row here, so everyone reads and writes
-- the same board rather than a copy of it.
CREATE TABLE IF NOT EXISTS system_members (
  system_id text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  user_id   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'editor',
  added_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (system_id, user_id)
);
CREATE INDEX IF NOT EXISTS system_members_by_user ON system_members (user_id);

CREATE TABLE IF NOT EXISTS groups (
  system_id text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id        text NOT NULL,
  name      text NOT NULL,
  color     text NOT NULL DEFAULT '',
  position  integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE TABLE IF NOT EXISTS departments (
  system_id text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id        text NOT NULL,
  name      text NOT NULL,
  position  integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE TABLE IF NOT EXISTS members (
  system_id     text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id            text NOT NULL,
  name          text NOT NULL,
  color         text NOT NULL,
  department_id text,
  position      integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE TABLE IF NOT EXISTS statuses (
  system_id text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id        text NOT NULL,
  name      text NOT NULL,
  color     text NOT NULL,
  terminal  boolean NOT NULL DEFAULT false,
  position  integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE TABLE IF NOT EXISTS recipients (
  system_id text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id        text NOT NULL,
  name      text NOT NULL,
  position  integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE TABLE IF NOT EXISTS projects (
  system_id text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id        text NOT NULL,
  name      text NOT NULL,
  owner     text NOT NULL DEFAULT '',
  status_id text,
  group_id  text,
  notes     text NOT NULL DEFAULT '',
  color     text NOT NULL DEFAULT '',
  is_open   boolean NOT NULL DEFAULT false,
  position  integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

-- A NULL project_id marks a general task, i.e. one not attached to a project.
-- A non-NULL parent_task_id marks a subtask of the task it names.
CREATE TABLE IF NOT EXISTS tasks (
  system_id      text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id             text NOT NULL,
  project_id     text,
  parent_task_id text,
  title          text NOT NULL,
  done           boolean NOT NULL DEFAULT false,
  due            date,
  assignee       text NOT NULL DEFAULT '',
  low_volume     boolean NOT NULL DEFAULT false,
  position       integer NOT NULL,
  PRIMARY KEY (system_id, id),
  FOREIGN KEY (system_id, project_id) REFERENCES projects(system_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follow_ups (
  system_id    text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id           text NOT NULL,
  question     text NOT NULL,
  project_name text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'Pending',
  answer       text NOT NULL DEFAULT '',
  recipient_id text NOT NULL DEFAULT '',
  added        date,
  position     integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE TABLE IF NOT EXISTS trash (
  system_id  text NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  id         text NOT NULL,
  kind       text NOT NULL,
  payload    jsonb NOT NULL,
  extra      jsonb,
  deleted_at date,
  position   integer NOT NULL,
  PRIMARY KEY (system_id, id)
);

CREATE INDEX IF NOT EXISTS tasks_by_project ON tasks (system_id, project_id);
CREATE INDEX IF NOT EXISTS tasks_by_parent ON tasks (system_id, parent_task_id);
`;

/** Columns added after a release; every statement is safe to run repeatedly. */
const MIGRATE_AFTER_SQL = `
ALTER TABLE systems  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE systems  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'System';
ALTER TABLE systems  ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE systems  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS group_id text;
ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS parent_task_id text;
ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS low_volume boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'systems_owner_fk' AND table_name = 'systems'
  ) THEN
    ALTER TABLE systems
      ADD CONSTRAINT systems_owner_fk FOREIGN KEY (owner_id)
      REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
`;

let ready: Promise<void> | null = null;

/** Creates or updates the schema on first use; later calls reuse the promise. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const client: PoolClient = await getPool().connect();
      try {
        await client.query(MIGRATE_BEFORE_SQL);
        await client.query(SCHEMA_SQL);
        await client.query(MIGRATE_AFTER_SQL);
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
