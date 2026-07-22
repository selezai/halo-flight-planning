const DEFAULT_MAPTILER_BASE_STYLE = 'outdoor-v2';
const SAFE_MAPTILER_STYLE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export interface RasterBaseMapOptions {
  tilesUrl: string;
  attribution: string;
  tileSize: number;
}

export interface BaseMapOptions {
  baseStyleId: string;
  baseSource: 'maptiler-vector' | 'openstreetmap-raster';
  baseStyleUrl?: string;
  rasterFallback: RasterBaseMapOptions;
  backgroundColor?: string;
}

export function getBaseMapOptions({
  maptilerKey,
  maptilerStyleId,
}: {
  maptilerKey?: string;
  maptilerStyleId?: string;
}): BaseMapOptions {
  const normalizedMaptilerKey = normalizeEnvValue(maptilerKey);

  if (normalizedMaptilerKey) {
    const baseStyleId = normalizeMaptilerBaseStyleId(maptilerStyleId);
    const encodedKey = encodeURIComponent(normalizedMaptilerKey);

    return {
      baseStyleId,
      baseSource: 'maptiler-vector',
      baseStyleUrl: buildMaptilerVectorStyleUrl(baseStyleId, encodedKey),
      rasterFallback: {
        tilesUrl: buildMaptilerRasterTileUrl('basic-v2', encodedKey),
        attribution: 'MapTiler and OpenStreetMap contributors',
        tileSize: 512,
      },
      backgroundColor: '#f3f0e8',
    };
  }

  return {
    baseStyleId: 'openstreetmap-standard',
    baseSource: 'openstreetmap-raster',
    rasterFallback: {
      tilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: 'OpenStreetMap contributors',
      tileSize: 256,
    },
    backgroundColor: '#f3f0e8',
  };
}

function normalizeEnvValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function buildMaptilerVectorStyleUrl(styleId: string, encodedKey: string): string {
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${encodedKey}`;
}

function buildMaptilerRasterTileUrl(styleId: string, encodedKey: string): string {
  return `https://api.maptiler.com/maps/${styleId}/{z}/{x}/{y}.png?key=${encodedKey}`;
}

export function normalizeMaptilerBaseStyleId(value?: string): string {
  const trimmed = value?.trim();

  if (!trimmed || !SAFE_MAPTILER_STYLE_ID_RE.test(trimmed)) {
    return DEFAULT_MAPTILER_BASE_STYLE;
  }

  return trimmed;
}
