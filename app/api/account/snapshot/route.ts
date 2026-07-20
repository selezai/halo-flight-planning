import { NextRequest, NextResponse } from 'next/server';
import { parsePlannerSnapshotPayload } from '@/lib/account/plannerSnapshot';
import {
  getAccountPlannerSnapshot,
  isAccountDatabaseConfigured,
  upsertAccountPlannerSnapshot,
} from '@/lib/account/snapshotRepository';
import { requireAccountUserId } from '@/lib/auth/accountAuth';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/account/snapshot', async () => {
  const authResult = await requireAccountUserId();

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isAccountDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Account sync database is not configured. Finish Neon setup before using cloud sync.' },
      { status: 503 }
    );
  }

  try {
    const record = await getAccountPlannerSnapshot(authResult.userId);
    return NextResponse.json({ snapshot: record });
  } catch (error) {
    logAccountSnapshotFailure('account_snapshot_get_failed', error);
    return NextResponse.json(
      { error: 'Account sync is unavailable.' },
      { status: 503 }
    );
  }
});

export const PUT = withApiLogging('/api/account/snapshot', async (request: NextRequest) => {
  const authResult = await requireAccountUserId();

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isAccountDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Account sync database is not configured. Finish Neon setup before using cloud sync.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  let snapshot;
  try {
    snapshot = parsePlannerSnapshotPayload(payload);
  } catch {
    return NextResponse.json(
      { error: 'Planner snapshot is invalid.' },
      { status: 400 }
    );
  }

  try {
    const record = await upsertAccountPlannerSnapshot(authResult.userId, snapshot);
    return NextResponse.json({ snapshot: record });
  } catch (error) {
    logAccountSnapshotFailure('account_snapshot_save_failed', error);
    return NextResponse.json(
      { error: 'Account sync is unavailable.' },
      { status: 503 }
    );
  }
});

function logAccountSnapshotFailure(message: string, error: unknown) {
  console.error(JSON.stringify({
    level: 'error',
    message,
    error: error instanceof Error ? error.name : 'UnknownError',
    timestamp: new Date().toISOString(),
  }));
}
