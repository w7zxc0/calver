import { NextResponse } from 'next/server';
import { currentUser, failed } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ user: await currentUser() });
  } catch (err) {
    console.error('GET /api/auth/me failed', err);
    return failed(err);
  }
}
