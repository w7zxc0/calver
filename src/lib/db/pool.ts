import { Pool, types } from 'pg';

// DATE columns come back as plain 'YYYY-MM-DD' strings, which is exactly the
// shape the app stores due dates in. Without this, pg hands back a Date object
// shifted into the server's timezone.
types.setTypeParser(1082, (value: string) => value);

const globalForPool = globalThis as unknown as { calverPool?: Pool };

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }

  if (!globalForPool.calverPool) {
    globalForPool.calverPool = new Pool({
      connectionString,
      // Managed Postgres (Neon and friends) serves a publicly trusted
      // certificate, so full verification is kept on.
      ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPool.calverPool;
}
