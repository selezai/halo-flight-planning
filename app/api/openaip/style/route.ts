import { NextRequest, NextResponse } from 'next/server';
import { getBaseMapOptions } from '@/lib/openaip/basemap';
import { convertOpenAipStyle, validateStyle } from '@/lib/openaip/styleConverter';
import { withApiLogging } from '@/lib/observability/api';

const OPENAIP_STYLE_URL = 'https://api.tiles.openaip.net/api/styles/openaip-default-style.json';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/openaip/style', async (request: NextRequest) => {
  const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;
  const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const MAPTILER_BASE_STYLE = process.env.NEXT_PUBLIC_MAPTILER_BASE_STYLE;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!OPENAIP_API_KEY) {
    return NextResponse.json(createFallbackStyle(), {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    // Fetch OpenAIP style
    const response = await fetch(OPENAIP_STYLE_URL, {
      headers: {
        'x-openaip-api-key': OPENAIP_API_KEY,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error('Failed to fetch OpenAIP style:', response.status, response.statusText);
      return NextResponse.json(createFallbackStyle(), {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
        },
      });
    }

    const originalStyle = await response.json();

    // Convert style for MapLibre compatibility
    const convertedStyle = convertOpenAipStyle(originalStyle, {
      spriteUrl: `${baseUrl}/api/openaip/sprites/openaip`,
      glyphsUrl: getGlyphsUrl(MAPTILER_KEY),
      tilesProxyUrl: `${baseUrl}/api/openaip/tiles`,
      ...getBaseMapOptions({
        maptilerKey: MAPTILER_KEY,
        maptilerStyleId: MAPTILER_BASE_STYLE,
      }),
    });

    // Validate converted style
    const validation = validateStyle(convertedStyle);
    if (!validation.valid) {
      console.warn('Style validation warnings:', validation.errors);
    }

    // Return converted style
    return NextResponse.json(convertedStyle, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error processing OpenAIP style:', error);
    return NextResponse.json(createFallbackStyle(), {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
      },
    });
  }
});

function getGlyphsUrl(maptilerKey?: string) {
  if (maptilerKey) {
    return `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${maptilerKey}`;
  }

  return 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
}

function createFallbackStyle() {
  const baseOptions = getBaseMapOptions({
    maptilerKey: process.env.NEXT_PUBLIC_MAPTILER_KEY,
    maptilerStyleId: process.env.NEXT_PUBLIC_MAPTILER_BASE_STYLE,
  });

  return {
    version: 8,
    name: 'Halo fallback planning map',
    metadata: {
      haloDegraded: true,
      reason: 'OpenAIP is not configured or unavailable. Planning tools remain available.',
      haloBaseMap: {
        source: baseOptions.baseSource,
        style: baseOptions.baseStyleId,
      },
    },
    glyphs: getGlyphsUrl(process.env.NEXT_PUBLIC_MAPTILER_KEY),
    sources: {
      'maptiler-base': {
        type: 'raster',
        tiles: [baseOptions.baseTilesUrl],
        tileSize: baseOptions.baseTileSize,
        attribution: baseOptions.baseAttribution,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'maptiler-base',
        type: 'raster',
        source: 'maptiler-base',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}
