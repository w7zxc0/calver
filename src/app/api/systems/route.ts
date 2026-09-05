import { NextResponse } from 'next/server';
import { currentUser, failed, unauthorized } from '@/lib/auth/session';
import { createSystemRow, listSystemsForUser } from '@/lib/db/auth-repo';
import { saveState } from '@/lib/db/repo';
import { freshState } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every system the caller owns or has been given access to. */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    return NextResponse.json({ systems: await listSystemsForUser(user.id) });
  } catch (err) {
    console.error('GET /api/systems failed', err);
    return failed(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name ?? '').trim() || 'New system';
    const seed = body?.seed !== false;

    const id = await createSystemRow(name.slice(0, 80), user.id);
    const state = freshState();
    // An unseeded system starts with the settings but none of the sample work.
    if (!seed) {
      state.projects = [];
      state.generalTasks = [];
      state.adminQueue = [];
      state.groups = [];
    }
    await saveState(state, id);

    return NextResponse.json({ id, name });
  } catch (err) {
    console.error('POST /api/systems failed', err);
    return failed(err);
  }
}
