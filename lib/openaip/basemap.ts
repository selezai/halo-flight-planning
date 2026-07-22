const DEFAULT_MAPTILER_BASE_STYLE = 'basic-v2';
const DEFAULT_BASE_DETAIL_MIN_ZOOM = 11;
const SAFE_MAPTILER_STYLE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export interface BaseMapOptions {
  baseTilesUrl: string;
  baseAttribution: string;
  baseTileSize: number;
  baseStyleId: string;
  baseSource: 'maptiler' | 'openstreetmap';
  baseDetailMinZoom?: number;
  backgroundColor?: string;
}

export function getBaseMapOptions({
  maptilerKey,
  maptilerStyleId,
}: {
  maptilerKey?: string;
  maptilerStyleId?: string;
}): BaseMapOptions {
  if (maptilerKey) {
    const baseStyleId = normalizeMaptilerBaseStyleId(maptilerStyleId);
    const encodedKey = encodeURIComponent(maptilerKey);

    return {
      baseTilesUrl: buildMaptilerRasterTileUrl(baseStyleId, encodedKey),
      baseAttribution: 'MapTiler and OpenStreetMap contributors',
      baseTileSize: 512,
      baseStyleId,
      baseSource: 'maptiler',
      baseDetailMinZoom: DEFAULT_BASE_DETAIL_MIN_ZOOM,
      backgroundColor: '#f3f0e8',
    };
  }

  return {
    baseTilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    baseAttribution: 'OpenStreetMap contributors',
    baseTileSize: 256,
    baseStyleId: 'openstreetmap-standard',
    baseSource: 'openstreetmap',
    backgroundColor: '#f3f0e8',
  };
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
