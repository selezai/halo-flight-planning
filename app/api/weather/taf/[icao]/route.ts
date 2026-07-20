import { NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

const ICAO_RE = /^[A-Z0-9]{4}$/;

export const GET = withApiLogging('/api/weather/taf/[icao]', async (
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
    const url = new URL('https://aviationweather.gov/api/data/taf');
    url.searchParams.set('ids', icao);
    url.searchParams.set('format', 'json');

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 },
    });

    if (response.status === 204) {
      return NextResponse.json({ taf: null }, { headers: cacheHeaders() });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch TAF data.' },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const first = Array.isArray(payload) ? payload[0] : null;

    return NextResponse.json(
      {
        taf: first
          ? {
              icao,
              raw: first.rawTAF ?? first.raw_text ?? '',
              issuedAt: first.issueTime ?? first.issue_time,
              validFrom: first.validTimeFrom ?? first.valid_time_from,
              validTo: first.validTimeTo ?? first.valid_time_to,
            }
          : null,
      },
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
    'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
  };
}
