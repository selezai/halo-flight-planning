const DEFAULT_MAPTILER_BASE_STYLE = 'outdoor-v2';
const SAFE_MAPTILER_STYLE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export interface BaseMapOptions {
  baseTilesUrl: string;
  baseAttribution: string;
  baseTileSize: number;
  baseStyleId: string;
  baseSource: 'maptiler' | 'openstreetmap';
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

    return {
      baseTilesUrl: `https://api.maptiler.com/maps/${baseStyleId}/{z}/{x}/{y}.png?key=${encodeURIComponent(maptilerKey)}`,
      baseAttribution: 'MapTiler and OpenStreetMap contributors',
      baseTileSize: 512,
      baseStyleId,
      baseSource: 'maptiler',
    };
  }

  return {
    baseTilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    baseAttribution: 'OpenStreetMap contributors',
    baseTileSize: 256,
    baseStyleId: 'openstreetmap-standard',
    baseSource: 'openstreetmap',
  };
}

export function normalizeMaptilerBaseStyleId(value?: string): string {
  const trimmed = value?.trim();

  if (!trimmed || !SAFE_MAPTILER_STYLE_ID_RE.test(trimmed)) {
    return DEFAULT_MAPTILER_BASE_STYLE;
  }

  return trimmed;
}
