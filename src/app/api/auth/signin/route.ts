import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { failed, setSessionCookie } from '@/lib/auth/session';
import { createSession, findUserByUsername } from '@/lib/db/auth-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? '');
    const password = String(body?.password ?? '');

    const user = await findUserByUsername(username);
    // Same message either way, so the form never confirms which names exist.
    const wrong = NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
    if (!user) return wrong;
    if (!(await verifyPassword(password, user.passwordHash))) return wrong;

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('POST /api/auth/signin failed', err);
    return failed(err);
  }
}
