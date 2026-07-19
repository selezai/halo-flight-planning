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
        { error: 'Invalid navaid id' },
        { status: 400 }
      );
    }
    
    // Fetch navaid details from OpenAIP Core API
    const response = await fetch(
      `${OPENAIP_API_BASE}/navaids/${id}?apiKey=${OPENAIP_API_KEY}`,
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
          { error: 'Navaid not found' },
          { status: 404 }
        );
      }
      
      console.error(`Navaid fetch failed: ${id}`, response.status);
      return NextResponse.json(
        { error: 'Failed to fetch navaid' },
        { status: response.status }
      );
    }

    const navaid = await response.json();

    return NextResponse.json(navaid, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Navaid proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
