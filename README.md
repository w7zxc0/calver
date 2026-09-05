# Calver

Projects, tasks, follow-ups and team workload, as a Next.js app backed by Postgres.
Each account keeps as many **systems** as it likes — a system is one board with
its own projects, people, statuses, wording and theme — and any system can be
shared with other accounts.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run dev
```

`DATABASE_URL` is any Postgres connection string (Neon, Supabase, RDS, local).
The schema is created and updated automatically on the first request. Sign up
with a username and password, and a starter system is seeded for you.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

## Accounts

Sign-up takes a username and a password, nothing else. Passwords are hashed
with Node's own scrypt (per-password salt, no third-party dependency) and are
never stored in readable form. A session is a random token; only its SHA-256
hash is kept, in the `sessions` table, and the token itself rides in an
httpOnly cookie that expires after 30 days.

The first account created on an install adopts any boards that predate accounts,
so upgrading from an earlier version does not strand existing work.

## Systems and sharing

- The left panel lists every system the account can open, and switches views.
- Owners can rename, delete, and share a system; everyone else can open and
  edit it, and can leave it.
- Sharing adds the other account to the **same** system rather than copying it,
  so both people read and write one board.
- An open board re-checks the server every 12 seconds and picks up someone
  else's changes, but only while nothing local is waiting to be saved, so an
  edit in progress is never overwritten. Two people editing the same field at
  the same second still resolve last-write-wins.

## How it fits together

- `src/app/api/auth/*` — sign up, sign in, sign out, current session.
- `src/app/api/systems/*` — list and create systems; read, write, rename,
  delete and share one system.
- `src/lib/auth/*` — password hashing and the session cookie.
- `src/lib/db/schema.ts` — tables, created and migrated on first use.
- `src/lib/db/repo.ts` — maps between a system's state document and its rows.
- `src/lib/db/auth-repo.ts` — accounts, sessions, membership.
- `src/components` — sidebar, board, and the three views.
- `src/lib/seed.ts` — starter data plus migration of older saved shapes.

The client holds one system's whole board as a document and writes it back on a
400 ms debounce; saves replace that system's rows inside a transaction.

## Upgrading an existing database

The schema step renames the old single-board tables in place: `workspaces`
becomes `systems`, and every `workspace_id` column becomes `system_id`. It runs
once, automatically, the first time the new code touches the database. An older
build of this app pointed at the same database will stop working after that, so
upgrade both together.
