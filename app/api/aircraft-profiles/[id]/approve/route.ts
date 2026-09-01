import { NextRequest, NextResponse } from 'next/server';
import {
  approveStoredAircraftPerformanceProfile,
  isAircraftProfileDatabaseConfigured,
} from '@/lib/account/aircraftProfileRepository';
import { requireAccountUserId } from '@/lib/auth/accountAuth';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

export const POST = withApiLogging('/api/aircraft-profiles/[id]/approve', async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const authResult = await requireAccountUserId();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);
  if (!isAircraftProfileDatabaseConfigured()) {
    return jsonError('Aircraft profile database is not configured.', 503);
  }

  const { id } = await context.params;
  if (!isValidProfileId(id)) return jsonError('Aircraft profile id is invalid.', 400);

  let notes: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    notes = body && typeof body === 'object' && !Array.isArray(body) && typeof body.notes === 'string'
      ? body.notes
      : undefined;
  } catch {
    notes = undefined;
  }

  try {
    const profile = await approveStoredAircraftPerformanceProfile(authResult.userId, id, notes);
    if (!profile) return jsonError('Aircraft performance profile was not found.', 404);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Aircraft performance profile cannot be approved.',
      400
    );
  }
});

function isValidProfileId(id: string): boolean {
  return id.length > 0 && id.length <= 120 && !/[\u0000-\u001F\u007F/\\]/.test(id);
}

function jsonError(error: string, status: 400 | 401 | 403 | 404 | 503) {
  return NextResponse.json({ error }, { status });
}
