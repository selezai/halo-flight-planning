import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/observability/api';
import {
  buildRouteNotamLocations,
  createNotamReview,
  FAA_NOTAM_SOURCE_URL,
  getConfiguredNotamProvider,
  normalizeFaaNotamPayload,
  normalizeSouthAfricaNotamPayload,
  sortRouteNotams,
  SOUTH_AFRICA_ATNS_FILE2FLY_URL,
  type NotamProvider,
} from '@/lib/planning/notams';
import type { RouteNotam, RouteNotamReview, WaypointType } from '@/types/planning';

const FAA_NOTAM_API_BASE = 'https://external-api.faa.gov/notamapi/v1';
const DEFAULT_SOUTH_AFRICA_NOTAM_SOURCE_URL = SOUTH_AFRICA_ATNS_FILE2FLY_URL;
const MAX_WAYPOINTS = 50;
const MAX_LOCATIONS = 12;
const NOTAM_LOCATION_RE = /^[A-Z0-9]{2,5}$/;
const SAFE_HEADER_NAME_RE = /^[A-Za-z0-9-]+$/;

export const dynamic = 'force-dynamic';

export const POST = withApiLogging('/api/notams/route', async (request: NextRequest) => {
  const provider = getConfiguredNotamProvider();
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
      source: providerReviewSource(provider),
      status: 'needs-route',
      message: `Add at least two route waypoints to run ${providerDisplayName(provider)} NOTAM review.`,
      locations,
      sourceUrl: providerSourceUrl(provider),
    }));
  }

  if (locations.length === 0) {
    return NextResponse.json(createNotamReview({
      source: providerReviewSource(provider),
      status: 'unavailable',
      message: 'No airport or navaid identifiers are available for route NOTAM lookup.',
      locations,
      sourceUrl: providerSourceUrl(provider),
    }), { status: 422 });
  }

  if (provider === 'faa') {
    return handleFaaReview(locations);
  }

  if (provider === 'south-africa-live') {
    return handleSouthAfricaLiveReview(validation.value.waypoints, locations);
  }

  return handleSouthAfricaManualReview(locations);
});

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

async function handleFaaReview(locations: string[]) {
  const credentials = getFaaCredentials();

  if (!credentials) {
    return NextResponse.json(
      createNotamReview({
        source: 'unavailable',
        status: 'unavailable',
        message: 'FAA NOTAM API credentials are not configured; live route NOTAM review is unavailable.',
        locations,
        sourceUrl: FAA_NOTAM_SOURCE_URL,
      }),
      { status: 503 }
    );
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
        sourceUrl: FAA_NOTAM_SOURCE_URL,
      }),
      { status: 503 }
    );
  }

  const review = createNotamReview({
    source: 'faa-notam-api',
    status: partial ? 'partial' : 'complete',
    message: summarizeFaaNotamReview(notams, locations, partial),
    notams,
    locations,
    queryCount: results.length,
    sourceUrl: FAA_NOTAM_SOURCE_URL,
  });

  return NextResponse.json(review, {
    status: partial ? 206 : 200,
    headers: {
      'Cache-Control': 'private, max-age=300',
    },
  });
}

function handleSouthAfricaManualReview(locations: string[]) {
  return NextResponse.json(createNotamReview({
    source: 'south-africa-official',
    status: 'manual-required',
    message: southAfricaManualMessage(locations),
    locations,
    queryCount: 0,
    sourceUrl: getSouthAfricaSourceUrl(),
  }), {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=300',
    },
  });
}

async function handleSouthAfricaLiveReview(
  waypoints: Array<Pick<RouteWaypointInput, 'ident' | 'type'>>,
  locations: string[]
) {
  const config = getSouthAfricaLiveConfig();

  if (!config) {
    return NextResponse.json(createNotamReview({
      source: 'south-africa-official',
      status: 'unavailable',
      message: [
        'Authorized South Africa NOTAM feed is not configured.',
        `Halo prepared route locations ${locations.join(', ')}.`,
        'Set SOUTH_AFRICA_NOTAM_API_URL and SOUTH_AFRICA_NOTAM_API_KEY only after SACAA/ATNS or an authorized provider grants API access.',
        'Until then, obtain the official PIB through ATNS File2Fly or the SACAA/AIMU briefing office.',
      ].join(' '),
      locations,
      queryCount: 0,
      sourceUrl: getSouthAfricaSourceUrl(),
    }), { status: 503 });
  }

  const result = await fetchSouthAfricaOfficialNotams(config, locations, waypoints);

  if (result.status === 'auth-failed') {
    return NextResponse.json(createNotamReview({
      source: 'south-africa-official',
      status: 'unavailable',
      message: 'Authorized South Africa NOTAM feed rejected the configured credentials; check SOUTH_AFRICA_NOTAM_API_KEY and provider authorization.',
      locations,
      queryCount: 1,
      sourceUrl: config.sourceUrl,
    }), { status: 503 });
  }

  if (result.status === 'error') {
    return NextResponse.json(createNotamReview({
      source: 'south-africa-official',
      status: 'partial',
      message: `South Africa NOTAM feed could not be reached for ${locations.join(', ')}. Continue official File2Fly/SACAA preflight briefing.`,
      locations,
      queryCount: 1,
      sourceUrl: config.sourceUrl,
    }), { status: 206 });
  }

  const notams = sortRouteNotams(result.notams);

  return NextResponse.json(createNotamReview({
    source: 'south-africa-official',
    status: 'complete',
    message: summarizeSouthAfricaLiveReview(notams, locations),
    notams,
    locations,
    queryCount: 1,
    sourceUrl: config.sourceUrl,
  }), {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=300',
    },
  });
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

async function fetchSouthAfricaOfficialNotams(
  config: SouthAfricaLiveConfig,
  locations: string[],
  waypoints: Array<Pick<RouteWaypointInput, 'ident' | 'type'>>
): Promise<
  | { status: 'ok'; notams: RouteNotam[] }
  | { status: 'auth-failed' }
  | { status: 'error' }
> {
  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [config.authHeader]: formatSouthAfricaAuthValue(config),
      },
      body: JSON.stringify({
        briefingType: 'route',
        locations,
        waypoints,
        source: 'halo',
      }),
      cache: 'no-store',
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'auth-failed' };
    }

    if (!response.ok) {
      console.error('South Africa NOTAM feed failed:', response.status);
      return { status: 'error' };
    }

    const payload = await response.json();
    return {
      status: 'ok',
      notams: normalizeSouthAfricaNotamPayload(payload, locations, config.sourceUrl),
    };
  } catch (error) {
    console.error('South Africa NOTAM feed error:', error);
    return { status: 'error' };
  }
}

function summarizeFaaNotamReview(notams: RouteNotam[], locations: string[], partial: boolean): string {
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

function summarizeSouthAfricaLiveReview(notams: RouteNotam[], locations: string[]): string {
  if (notams.length === 0) {
    return `No active route-location NOTAMs returned by the authorized South Africa feed for ${locations.join(', ')}. Continue official File2Fly/SACAA preflight briefing.`;
  }

  const criticalCount = notams.filter((notam) => notam.severity === 'critical').length;
  if (criticalCount > 0) {
    return `${criticalCount} critical South Africa NOTAM${criticalCount === 1 ? '' : 's'} found for ${locations.join(', ')}.`;
  }

  return `${notams.length} South Africa route-location NOTAM${notams.length === 1 ? '' : 's'} found for ${locations.join(', ')}.`;
}

function southAfricaManualMessage(locations: string[]): string {
  return [
    `Official South Africa NOTAM briefing is required for route locations ${locations.join(', ')}.`,
    'Halo does not scrape or fake SACAA/ATNS NOTAMs.',
    'Use ATNS File2Fly for route/aerodrome/zone PIBs or contact the SACAA/AIMU briefing office before flight.',
  ].join(' ');
}

function getFaaCredentials(): FaaNotamCredentials | null {
  const clientId = process.env.FAA_NOTAM_CLIENT_ID?.trim();
  const clientSecret = process.env.FAA_NOTAM_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function getSouthAfricaLiveConfig(): SouthAfricaLiveConfig | null {
  const apiUrl = process.env.SOUTH_AFRICA_NOTAM_API_URL?.trim();
  const apiKey = process.env.SOUTH_AFRICA_NOTAM_API_KEY?.trim();
  const authHeader = process.env.SOUTH_AFRICA_NOTAM_API_AUTH_HEADER?.trim() || 'Authorization';
  const authScheme = process.env.SOUTH_AFRICA_NOTAM_API_AUTH_SCHEME?.trim() || 'Bearer';
  const sourceUrl = getSouthAfricaSourceUrl();

  if (!apiUrl || !apiKey || !SAFE_HEADER_NAME_RE.test(authHeader)) return null;

  try {
    const parsedUrl = new URL(apiUrl);
    const localHost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    if (parsedUrl.protocol !== 'https:' && !localHost) return null;
    if (parsedUrl.username || parsedUrl.password) return null;
  } catch {
    return null;
  }

  return { apiUrl, apiKey, authHeader, authScheme, sourceUrl };
}

function getSouthAfricaSourceUrl(): string {
  const value = process.env.SOUTH_AFRICA_NOTAM_SOURCE_URL?.trim();
  if (!value) return DEFAULT_SOUTH_AFRICA_NOTAM_SOURCE_URL;

  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol !== 'https:') return DEFAULT_SOUTH_AFRICA_NOTAM_SOURCE_URL;
    return parsedUrl.toString();
  } catch {
    return DEFAULT_SOUTH_AFRICA_NOTAM_SOURCE_URL;
  }
}

function formatSouthAfricaAuthValue(config: SouthAfricaLiveConfig): string {
  if (config.authScheme.toLowerCase() === 'none') return config.apiKey;
  return `${config.authScheme} ${config.apiKey}`;
}

function providerReviewSource(provider: NotamProvider): RouteNotamReview['source'] {
  return provider === 'faa' ? 'faa-notam-api' : 'south-africa-official';
}

function providerSourceUrl(provider: NotamProvider): string {
  if (provider === 'faa') return FAA_NOTAM_SOURCE_URL;
  return getSouthAfricaSourceUrl();
}

function providerDisplayName(provider: NotamProvider): string {
  if (provider === 'faa') return 'FAA';
  if (provider === 'south-africa-live') return 'authorized South Africa';
  return 'official South Africa';
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

interface SouthAfricaLiveConfig {
  apiUrl: string;
  apiKey: string;
  authHeader: string;
  authScheme: string;
  sourceUrl: string;
}
