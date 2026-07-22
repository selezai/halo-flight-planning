import { describe, expect, it } from 'vitest';
import { getBaseMapOptions, normalizeMaptilerBaseStyleId } from '@/lib/openaip/basemap';

describe('OpenAIP basemap options', () => {
  it('uses a minimal OpenAIP-like MapTiler basic basemap by default when a MapTiler key is configured', () => {
    const options = getBaseMapOptions({ maptilerKey: 'test-key' });

    expect(options.baseSource).toBe('maptiler');
    expect(options.baseStyleId).toBe('basic-v2');
    expect(options.baseTilesUrl).toBe('https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=test-key');
    expect(options.baseTileSize).toBe(512);
    expect(options.baseDetailMinZoom).toBe(11);
    expect(options.backgroundColor).toBe('#f3f0e8');
  });

  it('allows safe MapTiler style overrides for later tuning', () => {
    const options = getBaseMapOptions({
      maptilerKey: 'test-key',
      maptilerStyleId: 'outdoor-v2',
    });

    expect(options.baseStyleId).toBe('outdoor-v2');
    expect(options.baseTilesUrl).toContain('/maps/outdoor-v2/');
  });

  it('falls back to the default basic basemap for unsafe style overrides', () => {
    expect(normalizeMaptilerBaseStyleId('../secret')).toBe('basic-v2');
    expect(normalizeMaptilerBaseStyleId('')).toBe('basic-v2');
  });

  it('uses OpenStreetMap raster tiles when MapTiler is not configured', () => {
    const options = getBaseMapOptions({});

    expect(options.baseSource).toBe('openstreetmap');
    expect(options.baseStyleId).toBe('openstreetmap-standard');
    expect(options.baseTilesUrl).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(options.baseTileSize).toBe(256);
  });
});
