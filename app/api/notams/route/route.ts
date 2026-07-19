import { NextRequest, NextResponse } from 'next/server';
import {
  buildRouteNotamLocations,
  createNotamReview,
  FAA_NOTAM_SOURCE_URL,
  normalizeFaaNotamPayload,
  sortRouteNotams,
} from '@/lib/planning/notams';
import type { RouteNotam, WaypointType } from '@/types/planning';

const FAA_NOTAM_API_BASE = 'https://external-api.faa.gov/notamapi/v1';
const MAX_WAYPOINTS = 50;
const MAX_LOCATIONS = 12;
const NOTAM_LOCATION_RE = /^[A-Z0-9]{2,5}$/;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const credentials = getFaaCredentials();

  if (!credentials) {
    return NextResponse.json(
      createNotamReview({
        source: 'unavailable',
        status: 'unavailable',
        message: 'FAA NOTAM API credentials are not configured; live route NOTAM review is unavailable.',
      }),
      { status: 503 }
    );
  }

  const validation = await validateRequest(request);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const locations = buildRouteNotamLocations(validation.value.waypoints, MAX_LOCATIONS);

  if (validation.value.waypoints.length < 2) {
    return NextResponse.json(createNotamReview({
      source: 'faa-notam-api',
      status: 'needs-route',
      message: 'Add at least two route waypoints to run live FAA NOTAM review.',
      locations,
    }));
  }

  if (locations.length === 0) {
    return NextResponse.json(createNotamReview({
      source: 'faa-notam-api',
      status: 'unavailable',
    message: 'No airport or navaid identifiers are available for route NOTAM lookup.',
      locations,
    }), { status: 422 });
  }

  const results = await Promise.all(
    locations.map((location) => fetchFaaNotamsForLocation(credentials, location))
  );
  const authFailed = results.some((result) => result.status === 'auth-failed');
  const partial = results.some((result) => result.status === 'error');
  const notams = sortRouteNotams(
    results.flatMap((result) => result.status === 'ok' ? result.notams : [])
  );

  if (authFailed) {
    return NextResponse.json(
      createNotamReview({
        source: 'unavailable',
        status: 'unavailable',
        message: 'FAA NOTAM API rejected the configured credentials; check FAA_NOTAM_CLIENT_ID and FAA_NOTAM_CLIENT_SECRET.',
        locations,
        queryCount: results.length,
      }),
      { status: 503 }
    );
  }

  const review = createNotamReview({
    source: 'faa-notam-api',
    status: partial ? 'partial' : 'complete',
    message: summarizeNotamReview(notams, locations, partial),
    notams,
    locations,
    queryCount: results.length,
  });

  return NextResponse.json(review, {
    status: partial ? 206 : 200,
    headers: {
      'Cache-Control': 'private, max-age=300',
    },
  });
}

async function validateRequest(request: NextRequest):
  Promise<
    | { ok: true; value: { waypoints: Array<Pick<RouteWaypointInput, 'ident' | 'type'>> } }
    | { ok: false; error: string }
  > {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { ok: false, error: 'Request body must be valid JSON.' };
  }

  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Request body must be an object.' };
  }

  const waypoints = (payload as { waypoints?: unknown }).waypoints;
  if (!Array.isArray(waypoints)) {
    return { ok: false, error: 'waypoints must be an array.' };
  }

  if (waypoints.length > MAX_WAYPOINTS) {
    return { ok: false, error: `waypoints cannot contain more than ${MAX_WAYPOINTS} items.` };
  }

  const parsed = waypoints.map((item): RouteWaypointInput | null => {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    const ident = typeof record.ident === 'string' ? record.ident.trim().toUpperCase() : undefined;
    const type = typeof record.type === 'string' ? record.type : undefined;

    if (ident && !NOTAM_LOCATION_RE.test(ident)) return null;
    if (!isWaypointType(type)) return null;

    return { ident, type };
  });

  if (parsed.some((item) => item === null)) {
    return { ok: false, error: 'Each waypoint must include a valid type and optional 2-5 character route identifier.' };
  }

  return {
    ok: true,
    value: {
      waypoints: parsed as RouteWaypointInput[],
    },
  };
}

async function fetchFaaNotamsForLocation(
  credentials: FaaNotamCredentials,
  location: string
): Promise<
  | { status: 'ok'; notams: RouteNotam[] }
  | { status: 'auth-failed' }
  | { status: 'error' }
> {
  const baseUrl = process.env.FAA_NOTAM_API_BASE_URL || FAA_NOTAM_API_BASE;
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/notams`);
  url.searchParams.set('icaoLocation', location);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      },
      next: { revalidate: 300 },
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'auth-failed' };
    }

    if (!response.ok) {
      console.error('FAA NOTAM lookup failed:', response.status, location);
      return { status: 'error' };
    }

    const payload = await response.json();
    return {
      status: 'ok',
      notams: normalizeFaaNotamPayload(payload, location),
    };
  } catch (error) {
    console.error('FAA NOTAM lookup error:', location, error);
    return { status: 'error' };
  }
}

function summarizeNotamReview(notams: RouteNotam[], locations: string[], partial: boolean): string {
  const prefix = partial ? 'Partial FAA NOTAM review. ' : '';
  if (notams.length === 0) {
    return `${prefix}No active route-location NOTAMs returned by FAA NOTAM API for ${locations.join(', ')}. Continue official preflight review.`;
  }

  const criticalCount = notams.filter((notam) => notam.severity === 'critical').length;
  if (criticalCount > 0) {
    return `${prefix}${criticalCount} critical NOTAM${criticalCount === 1 ? '' : 's'} found for ${locations.join(', ')}.`;
  }

  return `${prefix}${notams.length} route-location NOTAM${notams.length === 1 ? '' : 's'} found for ${locations.join(', ')}.`;
}

function getFaaCredentials(): FaaNotamCredentials | null {
  const clientId = process.env.FAA_NOTAM_CLIENT_ID?.trim();
  const clientSecret = process.env.FAA_NOTAM_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function isWaypointType(type: string | undefined): type is WaypointType {
  return type === 'airport' || type === 'navaid' || type === 'user' || type === 'reporting-point';
}

interface RouteWaypointInput {
  ident?: string;
  type: WaypointType;
}

interface FaaNotamCredentials {
  clientId: string;
  clientSecret: string;
}
