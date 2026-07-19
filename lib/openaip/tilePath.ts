const TILE_COORDINATE_RE = /^\d{1,2}\/\d+\/\d+\.pbf$/i;

/**
 * OpenAIP styles contain named vector sources such as `openaip-data`, but the
 * upstream tile endpoint expects only `{z}/{x}/{y}.pbf`.
 *
 * Accept both forms so older cached styles and the current converted style keep
 * working, while always forwarding only the coordinate tile path upstream.
 */
export function normalizeOpenAipTilePath(pathParts: string[]): string | null {
  if (pathParts.length === 3) {
    const tilePath = pathParts.join('/');
    return TILE_COORDINATE_RE.test(tilePath) ? tilePath : null;
  }

  if (pathParts.length === 4 && /^[a-z0-9_-]+$/i.test(pathParts[0])) {
    const tilePath = pathParts.slice(1).join('/');
    return TILE_COORDINATE_RE.test(tilePath) ? tilePath : null;
  }

  return null;
}
