import { NextRequest, NextResponse } from 'next/server';
import { getBaseMapOptions } from '@/lib/openaip/basemap';
import type { BaseMapOptions } from '@/lib/openaip/basemap';
import { convertOpenAipStyle, validateStyle } from '@/lib/openaip/styleConverter';
import type { MapStyle, VectorBaseMapStyle } from '@/lib/openaip/styleConverter';
import { withApiLogging } from '@/lib/observability/api';

const OPENAIP_STYLE_URL = 'https://api.tiles.openaip.net/api/styles/openaip-default-style.json';
const STYLE_RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/openaip/style', async (request: NextRequest) => {
  const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;
  const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const MAPTILER_BASE_STYLE = process.env.NEXT_PUBLIC_MAPTILER_BASE_STYLE;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const baseOptions = getBaseMapOptions({
    maptilerKey: MAPTILER_KEY,
    maptilerStyleId: MAPTILER_BASE_STYLE,
  });

  if (!OPENAIP_API_KEY) {
    return NextResponse.json(await createFallbackStyle(baseOptions), {
      headers: STYLE_RESPONSE_HEADERS,
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
      return NextResponse.json(await createFallbackStyle(baseOptions), {
        headers: STYLE_RESPONSE_HEADERS,
      });
    }

    const originalStyle = await response.json();
    const baseMapStyle = await fetchBaseMapStyle(baseOptions);

    // Convert style for MapLibre compatibility
    const convertedStyle = convertOpenAipStyle(originalStyle, {
      spriteUrl: `${baseUrl}/api/openaip/sprites/openaip`,
      glyphsUrl: getGlyphsUrl(MAPTILER_KEY),
      tilesProxyUrl: `${baseUrl}/api/openaip/tiles`,
      baseMapStyle,
      rasterBaseMap: baseOptions.rasterFallback,
      backgroundColor: baseOptions.backgroundColor,
    });

    convertedStyle.metadata = {
      ...(typeof convertedStyle.metadata === 'object' && convertedStyle.metadata !== null
        ? convertedStyle.metadata
        : {}),
      haloBaseMap: {
        source: baseOptions.baseSource,
        style: baseOptions.baseStyleId,
        mode: baseMapStyle ? 'vector-style' : 'raster-fallback',
      },
    };

    // Validate converted style
    const validation = validateStyle(convertedStyle);
    if (!validation.valid) {
      console.warn('Style validation warnings:', validation.errors);
    }

    // Return converted style
    return NextResponse.json(convertedStyle, {
      headers: STYLE_RESPONSE_HEADERS,
    });
  } catch (error) {
    console.error('Error processing OpenAIP style:', error);
    return NextResponse.json(await createFallbackStyle(baseOptions), {
      headers: STYLE_RESPONSE_HEADERS,
    });
  }
});

function getGlyphsUrl(maptilerKey?: string) {
  if (maptilerKey) {
    return `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${maptilerKey}`;
  }

  return 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
}

async function fetchBaseMapStyle(baseOptions: BaseMapOptions): Promise<VectorBaseMapStyle | undefined> {
  if (!baseOptions.baseStyleUrl) {
    return undefined;
  }

  try {
    const response = await fetch(baseOptions.baseStyleUrl, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn('Failed to fetch vector basemap style:', response.status, response.statusText);
      return undefined;
    }

    const style = (await response.json()) as Partial<MapStyle>;

    if (!style.sources || !Array.isArray(style.layers)) {
      console.warn('Vector basemap style response was missing sources or layers.');
      return undefined;
    }

    return {
      sources: style.sources,
      layers: style.layers,
    };
  } catch (error) {
    console.warn('Error fetching vector basemap style:', error);
    return undefined;
  }
}

async function createFallbackStyle(baseOptions: BaseMapOptions) {
  const baseMapStyle = await fetchBaseMapStyle(baseOptions);
  const style = convertOpenAipStyle(
    {
      version: 8,
      sources: {},
      layers: [],
    },
    {
      spriteUrl: '/api/openaip/sprites/openaip',
      glyphsUrl: getGlyphsUrl(process.env.NEXT_PUBLIC_MAPTILER_KEY),
      tilesProxyUrl: '/api/openaip/tiles',
      baseMapStyle,
      rasterBaseMap: baseOptions.rasterFallback,
      backgroundColor: baseOptions.backgroundColor,
    }
  );

  style.name = 'Halo fallback planning map';
  style.metadata = {
    haloDegraded: true,
    reason: 'OpenAIP is not configured or unavailable. Planning tools remain available.',
    haloBaseMap: {
      source: baseOptions.baseSource,
      style: baseOptions.baseStyleId,
      mode: baseMapStyle ? 'vector-style' : 'raster-fallback',
    },
  };

  return {
    ...style,
  };
}
