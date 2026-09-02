import type { AppState } from './types';

const ENDPOINT = '/api/state';

async function failure(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    // Non-JSON error body; fall through to the status text.
  }
  return `${res.status} ${res.statusText}`;
}

/** Reads the workspace from Postgres. The server seeds it on first run. */
export async function fetchState(): Promise<AppState> {
  const res = await fetch(ENDPOINT, { cache: 'no-store' });
  if (!res.ok) throw new Error(await failure(res));
  return (await res.json()) as AppState;
}

/** Writes the workspace back to Postgres. */
export async function persistState(state: AppState): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(await failure(res));
}
