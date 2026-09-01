import { NextRequest, NextResponse } from 'next/server';
import {
  createAircraftPerformanceProfile,
  isAircraftProfileDatabaseConfigured,
  listAircraftPerformanceProfiles,
} from '@/lib/account/aircraftProfileRepository';
import { requireAccountUserId } from '@/lib/auth/accountAuth';
import { withApiLogging } from '@/lib/observability/api';
import { parseAircraftPerformanceProfile } from '@/lib/planning/aircraftPerformance';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/aircraft-profiles', async () => {
  const authResult = await requireAccountUserId();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);
  if (!isAircraftProfileDatabaseConfigured()) {
    return jsonError('Aircraft profile database is not configured. Finish Neon setup before using account aircraft profiles.', 503);
  }

  try {
    const profiles = await listAircraftPerformanceProfiles(authResult.userId);
    return NextResponse.json({ profiles });
  } catch (error) {
    logAircraftProfileApiFailure('aircraft_profiles_list_failed', error);
    return jsonError('Aircraft profiles are unavailable.', 503);
  }
});

export const POST = withApiLogging('/api/aircraft-profiles', async (request: NextRequest) => {
  const authResult = await requireAccountUserId();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);
  if (!isAircraftProfileDatabaseConfigured()) {
    return jsonError('Aircraft profile database is not configured. Finish Neon setup before saving aircraft profiles.', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  let profile;
  try {
    profile = parseAircraftPerformanceProfile(body);
  } catch {
    return jsonError('Aircraft performance profile is invalid.', 400);
  }

  try {
    const saved = await createAircraftPerformanceProfile(authResult.userId, profile);
    return NextResponse.json({ profile: saved }, { status: 201 });
  } catch (error) {
    logAircraftProfileApiFailure('aircraft_profile_create_failed', error);
    return jsonError('Aircraft performance profile could not be saved.', 503);
  }
});

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
