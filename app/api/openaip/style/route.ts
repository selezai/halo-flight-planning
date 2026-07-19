import { NextRequest, NextResponse } from 'next/server';
import { convertOpenAipStyle, validateStyle } from '@/lib/openaip/styleConverter';
import { withApiLogging } from '@/lib/observability/apiLogger';

const OPENAIP_STYLE_URL = 'https://api.tiles.openaip.net/api/styles/openaip-default-style.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withApiLogging(request, '/api/openaip/style', () => handleGet(request));
}

async function handleGet(request: NextRequest) {
  const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;
  const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
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
      ...getBaseMapOptions(MAPTILER_KEY),
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
}

function getGlyphsUrl(maptilerKey?: string) {
  if (maptilerKey) {
    return `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${maptilerKey}`;
  }

  return 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
}

function getBaseMapOptions(maptilerKey?: string) {
  if (maptilerKey) {
    return {
      baseTilesUrl: `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${maptilerKey}`,
      baseAttribution: 'MapTiler and OpenStreetMap contributors',
      baseTileSize: 512,
    };
  }

  return {
    baseTilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    baseAttribution: 'OpenStreetMap contributors',
    baseTileSize: 256,
  };
}

function createFallbackStyle() {
  const baseOptions = getBaseMapOptions(process.env.NEXT_PUBLIC_MAPTILER_KEY);

  return {
    version: 8,
    name: 'Halo fallback planning map',
    metadata: {
      haloDegraded: true,
      reason: 'OpenAIP is not configured or unavailable. Planning tools remain available.',
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
