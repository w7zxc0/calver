import { NextResponse } from 'next/server';
import { clearSessionCookie, failed, readSessionToken } from '@/lib/auth/session';
import { deleteSession } from '@/lib/db/auth-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await deleteSession(await readSessionToken());
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/signout failed', err);
    return failed(err);
  }
}
