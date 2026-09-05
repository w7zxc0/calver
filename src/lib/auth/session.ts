import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type PublicUser, roleFor, type SystemRole, userForToken } from '@/lib/db/auth-repo';

export const SESSION_COOKIE = 'calver_session';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE_BASE, expires: expiresAt });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, '', { ...COOKIE_BASE, maxAge: 0 });
}

export async function readSessionToken(): Promise<string> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? '';
}

/** The signed-in user, or null when the cookie is missing or expired. */
export async function currentUser(): Promise<PublicUser | null> {
  return userForToken(await readSessionToken());
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: 'You do not have access to that system.' }, { status: 403 });

/**
 * Resolves the caller and their role on one system in a single step, so route
 * handlers never touch a system the user is not a member of.
 */
export async function requireSystemAccess(
  systemId: string,
  need: SystemRole | 'any' = 'any',
): Promise<
  | { ok: true; user: PublicUser; role: SystemRole }
  | { ok: false; response: NextResponse }
> {
  const user = await currentUser();
  if (!user) return { ok: false, response: unauthorized() };

  const role = await roleFor(systemId, user.id);
  if (!role) return { ok: false, response: forbidden() };
  if (need === 'owner' && role !== 'owner') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Only the owner can do that.' }, { status: 403 }),
    };
  }
  return { ok: true, user, role };
}

export function failed(err: unknown, status = 500): NextResponse {
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return NextResponse.json({ error: message }, { status });
}
