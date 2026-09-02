# Calver — Management

Projects, tasks, follow-ups and team workload, as a Next.js app backed by Postgres.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run dev
```

`DATABASE_URL` is any Postgres connection string (Neon, Supabase, RDS, local).
The schema is created automatically on the first request, and the workspace is
seeded with starter data if it is empty.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

## How it fits together

- `src/app/api/state` — GET reads the workspace, PUT replaces it.
- `src/lib/db/schema.ts` — table definitions, applied on first use.
- `src/lib/db/repo.ts` — maps between the app's state document and the tables.
- `src/components` — the three views (Dashboard, Projects, Manage).
- `src/lib/seed.ts` — starter data plus migration of older saved shapes.

The client holds the whole workspace as one document and writes it back on a
400 ms debounce; saves replace the workspace inside a transaction.
