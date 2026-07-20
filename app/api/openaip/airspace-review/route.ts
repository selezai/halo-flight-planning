import { NextRequest, NextResponse } from 'next/server';
import { parseFeature } from '@/lib/openaip/featureParser';
import { withApiLogging } from '@/lib/observability/api';
import {
  buildRouteSignature,
  formatBBox,
  routeMatchesAirspaceGeometry,
  splitRouteIntoQuerySegments,
  type GeoJsonPolygon,
} from '@/lib/planning/airspaceCorridor';
import { buildRouteAirspaceAlert, sortRouteAirspaceAlerts } from '@/lib/planning/airspaceReview';
import type { Coordinates, RouteAirspaceAlert, RouteAirspaceReview, Waypoint } from '@/types/planning';

const OPENAIP_API_BASE = 'https://api.core.openaip.net/api';
const DEFAULT_CORRIDOR_NM = 5;
const MAX_CORRIDOR_NM = 25;
const MAX_WAYPOINTS = 50;
const MAX_QUERY_SEGMENTS = 24;
const MAX_SEGMENT_NM = 120;
const AIRSPACE_PAGE_LIMIT = 500;
const AIRSPACE_FIELDS = [
  '_id',
  'name',
  'type',
  'icaoClass',
  'activity',
  'onDemand',
  'onRequest',
  'byNotam',
  'specialAgreement',
  'requestCompliance',
  'geometry',
  'country',
  'upperLimit',
  'lowerLimit',
  'hoursOfOperation',
  'remarks',
].join(',');

export const dynamic = 'force-dynamic';

export const POST = withApiLogging('/api/openaip/airspace-review', async (request: NextRequest) => {
  const apiKey = process.env.OPENAIP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      createReview({
        source: 'openaip-core',
        status: 'unavailable',
        message: 'OpenAIP Core API key is not configured; server-side route corridor airspace review is unavailable.',
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

  const { waypoints, cruiseAltitudeFt, corridorNm } = validation.value;

  if (waypoints.length < 2) {
    return NextResponse.json(createReview({
      source: 'openaip-core',
      status: 'needs-route',
      message: 'Add at least two waypoints to run the OpenAIP Core route corridor airspace review.',
      corridorNm,
      routeSignature: buildRouteSignature(waypoints, cruiseAltitudeFt, corridorNm),
    }));
  }

  const querySegments = splitRouteIntoQuerySegments(waypoints, {
    corridorNm,
    maxSegmentNm: MAX_SEGMENT_NM,
  });

  if (querySegments.length > MAX_QUERY_SEGMENTS) {
    return NextResponse.json(
      createReview({
        source: 'openaip-core',
        status: 'partial',
        message: `Route is too long for a single safe OpenAIP Core review. Reduce the route or split it into legs; Halo limits this endpoint to ${MAX_QUERY_SEGMENTS} bounded airspace queries.`,
        corridorNm,
        queryCount: querySegments.length,
        routeSignature: buildRouteSignature(waypoints, cruiseAltitudeFt, corridorNm),
      }),
      { status: 413 }
    );
  }

  const alertsById = new Map<string, RouteAirspaceAlert>();
  const candidatesById = new Map<string, Record<string, unknown>>();
  let partial = false;
  let rateLimited = false;

  for (const segment of querySegments) {
    const response = await fetchAirspacesForBBox(apiKey, formatBBox(segment.bbox));

    if (response.status === 'rate-limited') {
      rateLimited = true;
      partial = true;
      break;
    }

    if (response.status === 'error') {
      partial = true;
      continue;
    }

    if (response.totalPages > 1) {
      partial = true;
    }

    for (const item of response.items) {
      const id = stringValue(item._id) ?? JSON.stringify(item.geometry ?? item.name ?? item);
      if (!candidatesById.has(id)) {
        candidatesById.set(id, item);
      }

      const geometry = item.geometry as GeoJsonPolygon | undefined;
      const match = routeMatchesAirspaceGeometry(
        waypoints.map((waypoint) => waypoint.coordinates),
        geometry,
        corridorNm
      );

      if (!match.matches) continue;

      const parsed = parseFeature({
        sourceLayer: 'airspaces',
        properties: item,
        geometry,
      });
      const alert = buildRouteAirspaceAlert(parsed, cruiseAltitudeFt, {
        relationship: match.relationship === 'none' ? undefined : match.relationship,
        distanceNm: match.distanceNm,
        startDistanceNm: match.startDistanceNm,
        endDistanceNm: match.endDistanceNm,
      });

      if (!alert) continue;

      const existing = alertsById.get(alert.id);
      alertsById.set(alert.id, existing ? sortRouteAirspaceAlerts([existing, alert])[0] : alert);
    }
  }

  const alerts = sortRouteAirspaceAlerts(Array.from(alertsById.values()));
  const status: RouteAirspaceReview['status'] = rateLimited
    ? 'rate-limited'
    : partial
      ? 'partial'
      : 'complete';

  return NextResponse.json(createReview({
    source: 'openaip-core',
    status,
    message: buildReviewMessage({
      alerts,
      status,
      cruiseAltitudeFt,
      corridorNm,
      rateLimited,
      partial,
    }),
    alerts,
    corridorNm,
    queryCount: querySegments.length,
    candidateCount: candidatesById.size,
    routeSignature: buildRouteSignature(waypoints, cruiseAltitudeFt, corridorNm),
  }), {
    headers: {
      'Cache-Control': 'private, max-age=120',
    },
  });
});

async function validateRequest(request: NextRequest): Promise<
  | { ok: true; value: { waypoints: Array<Pick<Waypoint, 'coordinates'>>; cruiseAltitudeFt: number; corridorNm: number } }
  | { ok: false; error: string }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, error: 'Request body must be valid JSON.' };
  }

  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be an object.' };
  }

  const record = body as Record<string, unknown>;
  const cruiseAltitudeFt = numberValue(record.cruiseAltitudeFt);
  const corridorNm = Math.min(
    MAX_CORRIDOR_NM,
    Math.max(0, numberValue(record.corridorNm) ?? DEFAULT_CORRIDOR_NM)
  );

  if (cruiseAltitudeFt === undefined || cruiseAltitudeFt < 0 || cruiseAltitudeFt > 60000) {
    return { ok: false, error: 'cruiseAltitudeFt must be between 0 and 60000.' };
  }

  if (!Array.isArray(record.waypoints)) {
    return { ok: false, error: 'waypoints must be an array.' };
  }

  if (record.waypoints.length > MAX_WAYPOINTS) {
    return { ok: false, error: `waypoints cannot exceed ${MAX_WAYPOINTS}.` };
  }

  const waypoints = record.waypoints.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const coordinates = (item as Record<string, unknown>).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;

    return {
      coordinates: [longitude, latitude] as Coordinates,
    };
  });

  if (waypoints.some((waypoint) => waypoint === null)) {
    return { ok: false, error: 'Each waypoint must include valid [longitude, latitude] coordinates.' };
  }

  return {
    ok: true,
    value: {
      waypoints: waypoints as Array<Pick<Waypoint, 'coordinates'>>,
      cruiseAltitudeFt,
      corridorNm,
    },
  };
}

async function fetchAirspacesForBBox(
  apiKey: string,
  bbox: string
): Promise<
  | { status: 'ok'; items: Record<string, unknown>[]; totalPages: number }
  | { status: 'rate-limited' }
  | { status: 'error' }
> {
  const url = new URL(`${OPENAIP_API_BASE}/airspaces`);
  url.searchParams.set('bbox', bbox);
  url.searchParams.set('limit', String(AIRSPACE_PAGE_LIMIT));
  url.searchParams.set('page', '1');
  url.searchParams.set('fields', AIRSPACE_FIELDS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-openaip-api-key': apiKey,
      },
      next: { revalidate: 300 },
    });

    if (response.status === 429) {
      return { status: 'rate-limited' };
    }

    if (!response.ok) {
      console.error('OpenAIP airspace review query failed:', response.status, bbox);
      return { status: 'error' };
    }

    const payload = await response.json() as {
      items?: Record<string, unknown>[];
      totalPages?: number;
    };

    return {
      status: 'ok',
      items: Array.isArray(payload.items) ? payload.items : [],
      totalPages: typeof payload.totalPages === 'number' ? payload.totalPages : 1,
    };
  } catch (error) {
    console.error('OpenAIP airspace review query error:', error);
    return { status: 'error' };
  }
}

function createReview(review: Partial<RouteAirspaceReview> & Pick<RouteAirspaceReview, 'source' | 'status' | 'message'>): RouteAirspaceReview {
  return {
    alerts: [],
    sampledPointCount: 0,
    visibleLayerCount: 0,
    updatedAt: new Date().toISOString(),
    ...review,
  };
}

function buildReviewMessage({
  alerts,
  status,
  cruiseAltitudeFt,
  corridorNm,
  rateLimited,
  partial,
}: {
  alerts: RouteAirspaceAlert[];
  status: RouteAirspaceReview['status'];
  cruiseAltitudeFt: number;
  corridorNm: number;
  rateLimited: boolean;
  partial: boolean;
}): string {
  const reviewableCount = alerts.filter((alert) => alert.requiresReview).length;
  const criticalCount = alerts.filter((alert) => alert.level === 'critical').length;
  const prefix = rateLimited
    ? 'OpenAIP rate limit reached before all route segments were checked. '
    : partial || status === 'partial'
      ? 'Partial OpenAIP Core review. '
      : '';

  if (criticalCount > 0) {
    return `${prefix}${criticalCount} airspace corridor item${criticalCount === 1 ? '' : 's'} overlap ${Math.round(cruiseAltitudeFt)} ft and require pilot review.`;
  }

  if (reviewableCount > 0) {
    return `${prefix}${reviewableCount} airspace corridor item${reviewableCount === 1 ? '' : 's'} require pilot review within ${corridorNm} nm of route.`;
  }

  if (alerts.length > 0) {
    return `${prefix}${alerts.length} OpenAIP airspace corridor item${alerts.length === 1 ? '' : 's'} found within ${corridorNm} nm; parsed vertical limits do not include ${Math.round(cruiseAltitudeFt)} ft.`;
  }

  return `${prefix}No OpenAIP Core airspace corridor intersections found within ${corridorNm} nm of the route.`;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}
