import { NextResponse } from 'next/server';
import { checkCredentials, hashPassword } from '@/lib/auth/password';
import { failed, setSessionCookie } from '@/lib/auth/session';
import {
  adoptOwnerlessSystems, countUsers, createSession, createSystemRow, createUser, findUserByUsername,
} from '@/lib/db/auth-repo';
import { saveState } from '@/lib/db/repo';
import { freshState } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? '');
    const password = String(body?.password ?? '');

    const problem = checkCredentials(username, password);
    if (problem) return NextResponse.json({ error: problem.message, field: problem.field }, { status: 400 });

    if (await findUserByUsername(username)) {
      return NextResponse.json(
        { error: 'That username is taken.', field: 'username' },
        { status: 409 },
      );
    }

    const isFirstAccount = (await countUsers()) === 0;
    const user = await createUser(username, await hashPassword(password));

    // An install that predates accounts has boards with no owner; the first
    // account takes them over so nothing is stranded.
    const adopted = isFirstAccount ? await adoptOwnerlessSystems(user.id) : 0;
    if (adopted === 0) {
      const systemId = await createSystemRow('System 1', user.id);
      await saveState(freshState(), systemId);
    }

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ user });
  } catch (err) {
    console.error('POST /api/auth/signup failed', err);
    return failed(err);
  }
}
