import { NextResponse } from 'next/server';
import { failed, requireSystemAccess } from '@/lib/auth/session';
import { systemUpdatedAt } from '@/lib/db/auth-repo';
import { loadState, saveState } from '@/lib/db/repo';
import { freshState, migrate } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** The whole board for one system, seeded on first read if it is empty. */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const access = await requireSystemAccess(id);
    if (!access.ok) return access.response;

    const stored = await loadState(id);
    if (!stored) {
      const seeded = freshState();
      await saveState(seeded, id);
      return NextResponse.json({ state: seeded, updatedAt: await systemUpdatedAt(id), role: access.role });
    }
    // migrate() fills in anything the stored rows predate, preferences included.
    return NextResponse.json({
      state: migrate(stored),
      updatedAt: await systemUpdatedAt(id),
      role: access.role,
    });
  } catch (err) {
    console.error('GET /api/systems/[id]/state failed', err);
    return failed(err);
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const access = await requireSystemAccess(id);
    if (!access.ok) return access.response;

    const body = await request.json();
    await saveState(migrate(body), id);
    return NextResponse.json({ ok: true, updatedAt: await systemUpdatedAt(id) });
  } catch (err) {
    console.error('PUT /api/systems/[id]/state failed', err);
    return failed(err);
  }
}
