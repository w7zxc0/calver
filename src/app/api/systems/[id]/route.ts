import { NextResponse } from 'next/server';
import { failed, requireSystemAccess } from '@/lib/auth/session';
import { deleteSystem, renameSystem } from '@/lib/db/auth-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const access = await requireSystemAccess(id);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Give the system a name.' }, { status: 400 });

    await renameSystem(id, name.slice(0, 80));
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error('PATCH /api/systems/[id] failed', err);
    return failed(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const access = await requireSystemAccess(id, 'owner');
    if (!access.ok) return access.response;

    await deleteSystem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/systems/[id] failed', err);
    return failed(err);
  }
}
