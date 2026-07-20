import { NextRequest, NextResponse } from 'next/server';
import { normalizeOpenAipTilePath } from '@/lib/openaip/tilePath';
import { withApiLogging } from '@/lib/observability/api';

const OPENAIP_TILES_BASE = 'https://api.tiles.openaip.net/api/data/openaip';
const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/openaip/tiles/[...path]', async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) => {
  if (!OPENAIP_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAIP API key not configured' },
      { status: 500 }
    );
  }

  try {
    const params = await context.params;
    const tilePath = normalizeOpenAipTilePath(params.path);
    if (!tilePath) {
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
});
