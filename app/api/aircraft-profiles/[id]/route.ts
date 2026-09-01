import { NextRequest, NextResponse } from 'next/server';
import {
  getAircraftPerformanceProfile,
  isAircraftProfileDatabaseConfigured,
  updateAircraftPerformanceProfile,
} from '@/lib/account/aircraftProfileRepository';
import { requireAccountUserId } from '@/lib/auth/accountAuth';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/aircraft-profiles/[id]', async (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const authResult = await requireAccountUserId();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);
  if (!isAircraftProfileDatabaseConfigured()) {
    return jsonError('Aircraft profile database is not configured.', 503);
  }

  const { id } = await context.params;
  if (!isValidProfileId(id)) return jsonError('Aircraft profile id is invalid.', 400);

  try {
    const profile = await getAircraftPerformanceProfile(authResult.userId, id);
    if (!profile) return jsonError('Aircraft performance profile was not found.', 404);
    return NextResponse.json({ profile });
  } catch (error) {
    logAircraftProfileApiFailure('aircraft_profile_get_failed', error);
    return jsonError('Aircraft profile is unavailable.', 503);
  }
});

export const PATCH = withApiLogging('/api/aircraft-profiles/[id]', async (
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('Request body must be an aircraft profile patch object.', 400);
  }

  try {
    const profile = await updateAircraftPerformanceProfile(authResult.userId, id, body);
    if (!profile) return jsonError('Aircraft performance profile was not found.', 404);
    return NextResponse.json({ profile });
  } catch (error) {
    logAircraftProfileApiFailure('aircraft_profile_update_failed', error);
    return jsonError('Aircraft performance profile could not be updated.', 400);
  }
});

function isValidProfileId(id: string): boolean {
  return id.length > 0 && id.length <= 120 && !/[\u0000-\u001F\u007F/\\]/.test(id);
}

function jsonError(error: string, status: 400 | 401 | 403 | 404 | 503) {
  return NextResponse.json({ error }, { status });
}

function logAircraftProfileApiFailure(message: string, error: unknown) {
  console.error(JSON.stringify({
    level: 'error',
    message,
    error: error instanceof Error ? error.name : 'UnknownError',
    timestamp: new Date().toISOString(),
  }));
}
