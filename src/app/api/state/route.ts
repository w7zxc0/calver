import { NextResponse } from 'next/server';
import { loadState, saveState } from '@/lib/db/repo';
import { freshState, migrate } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns the stored workspace, seeding it on first run. */
export async function GET() {
  try {
    const stored = await loadState();
    if (!stored) {
      const seeded = freshState();
      await saveState(seeded);
      return NextResponse.json(seeded);
    }
    // migrate() fills in anything the stored rows predate, preferences included.
    return NextResponse.json(migrate(stored));
  } catch (err) {
    console.error('GET /api/state failed', err);
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

/** Replaces the stored workspace with the posted document. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await saveState(migrate(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/state failed', err);
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown database error';
}
