import { NextResponse } from 'next/server';
import { failed, requireSystemAccess } from '@/lib/auth/session';
import {
  addSystemMember, findUserByUsername, listSystemMembers, removeSystemMember,
} from '@/lib/db/auth-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const access = await requireSystemAccess(id);
    if (!access.ok) return access.response;
    return NextResponse.json({ members: await listSystemMembers(id), role: access.role });
  } catch (err) {
    console.error('GET /api/systems/[id]/members failed', err);
    return failed(err);
  }
}

/** Sharing: the named account joins this same system, not a copy of it. */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const access = await requireSystemAccess(id, 'owner');
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const username = String(body?.username ?? '').trim();
    if (!username) return NextResponse.json({ error: 'Who should it be shared with?' }, { status: 400 });

    const invitee = await findUserByUsername(username);
    if (!invitee) return NextResponse.json({ error: 'No account with that username.' }, { status: 404 });
    if (invitee.id === access.user.id) {
      return NextResponse.json({ error: 'You already have access.' }, { status: 400 });
    }

    await addSystemMember(id, invitee.id);
    return NextResponse.json({ members: await listSystemMembers(id) });
  } catch (err) {
    console.error('POST /api/systems/[id]/members failed', err);
    return failed(err);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId ?? '');
    if (!userId) return NextResponse.json({ error: 'Which member?' }, { status: 400 });

    // Owners can remove anyone; anyone else may only remove themselves.
    const access = await requireSystemAccess(id);
    if (!access.ok) return access.response;
    if (access.role !== 'owner' && userId !== access.user.id) {
      return NextResponse.json({ error: 'Only the owner can remove other people.' }, { status: 403 });
    }

    await removeSystemMember(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/systems/[id]/members failed', err);
    return failed(err);
  }
}
