import { NextRequest, NextResponse } from 'next/server';
import {
  getAircraftPerformanceProfile,
  isAircraftProfileDatabaseConfigured,
  replaceStoredPerformanceTables,
} from '@/lib/account/aircraftProfileRepository';
import { requireAccountUserId } from '@/lib/auth/accountAuth';
import { withApiLogging } from '@/lib/observability/api';
import {
  exportPerformanceTablesCsv,
  parsePerformanceTablesCsv,
} from '@/lib/planning/aircraftPerformance';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/aircraft-profiles/[id]/tables.csv', async (
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

  const profile = await getAircraftPerformanceProfile(authResult.userId, id);
  if (!profile) return jsonError('Aircraft performance profile was not found.', 404);

  return new NextResponse(exportPerformanceTablesCsv(profile.tables), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${profile.registration || 'aircraft'}-performance-tables.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
});

export const POST = withApiLogging('/api/aircraft-profiles/[id]/tables.csv', async (
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

  const profile = await getAircraftPerformanceProfile(authResult.userId, id);
  if (!profile) return jsonError('Aircraft performance profile was not found.', 404);

  let csv: string;
  try {
    csv = await request.text();
  } catch {
    return jsonError('Request body must be CSV text.', 400);
  }

  try {
    const imported = parsePerformanceTablesCsv(csv, profile.fuelUnit);
    const updated = await replaceStoredPerformanceTables(authResult.userId, id, imported.tables);
    if (!updated) return jsonError('Aircraft performance profile was not found.', 404);
    return NextResponse.json({ profile: updated, importedRows: imported.rowCount });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Performance table CSV is invalid.',
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
