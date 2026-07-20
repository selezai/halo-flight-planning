import { NextResponse } from 'next/server';
import { normalizeMetarPayload } from '@/lib/planning/weather';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

const ICAO_RE = /^[A-Z0-9]{4}$/;

export const GET = withApiLogging('/api/weather/metar/[icao]', async (
  _request: Request,
  context: { params: Promise<{ icao: string }> }
) => {
  const { icao: rawIcao } = await context.params;
  const icao = rawIcao.toUpperCase();

  if (!ICAO_RE.test(icao)) {
    return NextResponse.json(
      { error: 'ICAO identifier must be four letters or numbers.' },
      { status: 400 }
    );
  }

  try {
    const url = new URL('https://aviationweather.gov/api/data/metar');
    url.searchParams.set('ids', icao);
    url.searchParams.set('format', 'json');

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (response.status === 204) {
      return NextResponse.json({ report: null }, { headers: cacheHeaders() });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch METAR data.' },
        { status: response.status }
      );
    }

    const payload = await response.json();
    return NextResponse.json(
      { report: normalizeMetarPayload(payload, icao) },
      { headers: cacheHeaders() }
    );
  } catch {
    return NextResponse.json(
      { error: 'Weather service unavailable.' },
      { status: 502 }
    );
  }
});

function cacheHeaders() {
  return {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
  };
}
