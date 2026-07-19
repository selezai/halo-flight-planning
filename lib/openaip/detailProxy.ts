import { NextResponse } from 'next/server';

export type OpenAipDetailResource =
  | 'airports'
  | 'airspaces'
  | 'navaids'
  | 'reporting-points'
  | 'obstacles'
  | 'hotspots'
  | 'hang-glidings'
  | 'rc-airfields';

const OPENAIP_API_BASE = 'https://api.core.openaip.net/api';
const ID_RE = /^[A-Za-z0-9_-]{3,80}$/;

const RESOURCE_LABELS: Record<OpenAipDetailResource, string> = {
  airports: 'Airport',
  airspaces: 'Airspace',
  navaids: 'Navaid',
  'reporting-points': 'Reporting point',
  obstacles: 'Obstacle',
  hotspots: 'Hotspot',
  'hang-glidings': 'Hang-gliding site',
  'rc-airfields': 'RC airfield',
};

export async function proxyOpenAipDetail(
  resource: OpenAipDetailResource,
  id: string
): Promise<NextResponse> {
  const apiKey = process.env.OPENAIP_API_KEY;
  const label = RESOURCE_LABELS[resource];

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAIP API key not configured' },
      { status: 500 }
    );
  }

  if (!ID_RE.test(id)) {
    return NextResponse.json(
      { error: `Invalid ${label.toLowerCase()} id` },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${OPENAIP_API_BASE}/${resource}/${encodeURIComponent(id)}`,
      {
        headers: {
          Accept: 'application/json',
          'x-openaip-api-key': apiKey,
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `${label} not found` },
          { status: 404 }
        );
      }

      console.error(`${label} fetch failed: ${id}`, response.status);
      return NextResponse.json(
        { error: `Failed to fetch ${label.toLowerCase()}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error(`${label} proxy error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
