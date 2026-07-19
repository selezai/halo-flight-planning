import { NextRequest, NextResponse } from 'next/server';

const OPENAIP_API_BASE = 'https://api.core.openaip.net/api';
const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;
const ID_RE = /^[A-Za-z0-9_-]{3,80}$/;

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!OPENAIP_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAIP API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    if (!ID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Invalid airspace id' },
        { status: 400 }
      );
    }
    
    // Fetch airspace details from OpenAIP Core API
    const response = await fetch(
      `${OPENAIP_API_BASE}/airspaces/${id}?apiKey=${OPENAIP_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Airspace not found' },
          { status: 404 }
        );
      }
      
      console.error(`Airspace fetch failed: ${id}`, response.status);
      return NextResponse.json(
        { error: 'Failed to fetch airspace' },
        { status: response.status }
      );
    }

    const airspace = await response.json();

    return NextResponse.json(airspace, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Airspace proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
