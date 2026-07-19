import { NextRequest, NextResponse } from 'next/server';

const OPENAIP_TILES_BASE = 'https://api.tiles.openaip.net/api/data/openaip';
const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;
const TILE_PATH_RE = /^[a-z0-9_-]+\/\d{1,2}\/\d+\/\d+\.pbf$/i;

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!OPENAIP_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAIP API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Reconstruct the tile path: z/x/y.pbf
    const tilePath = params.path.join('/');
    if (!TILE_PATH_RE.test(tilePath)) {
      return NextResponse.json(
        { error: 'Invalid tile path' },
        { status: 400 }
      );
    }

    const tileUrl = `${OPENAIP_TILES_BASE}/${tilePath}`;

    // Fetch tile from OpenAIP
    const response = await fetch(tileUrl, {
      headers: {
        'x-openaip-api-key': OPENAIP_API_KEY,
      },
    });

    if (!response.ok) {
      // Return empty tile for 404s (normal for tiles outside coverage)
      if (response.status === 404) {
        return new NextResponse(null, { status: 204 });
      }
      
      console.error(`Tile fetch failed: ${tileUrl}`, response.status);
      return NextResponse.json(
        { error: 'Failed to fetch tile' },
        { status: response.status }
      );
    }

    // Get tile data
    const tileData = await response.arrayBuffer();

    // Return tile with appropriate headers
    return new NextResponse(tileData, {
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': response.headers.get('content-encoding') || 'gzip',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Tile proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
