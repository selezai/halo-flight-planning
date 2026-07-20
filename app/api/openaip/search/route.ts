import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeOpenAipWaypointSearchResults,
  type OpenAipWaypointSearchResponse,
} from '@/lib/openaip/waypointSearch';
import { withApiLogging } from '@/lib/observability/api';

const OPENAIP_API_BASE = 'https://api.core.openaip.net/api';
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const AIRPORT_FIELDS = '_id,name,icaoCode,iataCode,altIdentifier,geometry,elevation,type,country';
const NAVAID_FIELDS = '_id,name,identifier,geometry,elevation,type,country';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/openaip/search', async (request: NextRequest) => {
  const apiKey = process.env.OPENAIP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAIP API key not configured' },
      { status: 503 }
    );
  }

  const validation = validateSearchParams(request.nextUrl.searchParams);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const { query, limit, country } = validation.value;

  const [airports, navaids] = await Promise.all([
    fetchOpenAipList(apiKey, 'airports', query, limit, AIRPORT_FIELDS, country),
    fetchOpenAipList(apiKey, 'navaids', query, limit, NAVAID_FIELDS, country),
  ]);

  const warning = [airports.warning, navaids.warning].filter(Boolean).join(' ');
  const payload: OpenAipWaypointSearchResponse = {
    source: 'openaip-core',
    query,
    waypoints: normalizeOpenAipWaypointSearchResults({
      airports: airports.items,
      navaids: navaids.items,
      limit,
    }),
    warning: warning || undefined,
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, max-age=300',
    },
  });
});

function validateSearchParams(params: URLSearchParams):
  | { ok: true; value: { query: string; limit: number; country?: string } }
  | { ok: false; error: string } {
  const query = params.get('q')?.trim() ?? '';
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
  const country = params.get('country')?.trim().toUpperCase();

  if (query.length < 2 || query.length > 80 || CONTROL_CHAR_RE.test(query)) {
    return {
      ok: false,
      error: 'q must be 2-80 characters and must not contain control characters.',
    };
  }

  if (country && !COUNTRY_RE.test(country)) {
    return { ok: false, error: 'country must be an ISO alpha-2 country code.' };
  }

  return {
    ok: true,
    value: {
      query,
      limit,
      country,
    },
  };
}

async function fetchOpenAipList(
  apiKey: string,
  resource: 'airports' | 'navaids',
  query: string,
  limit: number,
  fields: string,
  country?: string
): Promise<{ items: Record<string, unknown>[]; warning?: string }> {
  const url = new URL(`${OPENAIP_API_BASE}/${resource}`);
  url.searchParams.set('search', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', '1');
  url.searchParams.set('fields', fields);
  if (country) url.searchParams.set('country', country);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-openaip-api-key': apiKey,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`OpenAIP ${resource} search failed:`, response.status);
      return {
        items: [],
        warning: `${resource} search unavailable.`,
      };
    }

    const payload = await response.json() as { items?: Record<string, unknown>[] };
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
    };
  } catch (error) {
    console.error(`OpenAIP ${resource} search error:`, error);
    return {
      items: [],
      warning: `${resource} search unavailable.`,
    };
  }
}
