import { describe, expect, it } from 'vitest';
import { getBaseMapOptions, normalizeMaptilerBaseStyleId } from '@/lib/openaip/basemap';

describe('OpenAIP basemap options', () => {
  it('uses an OpenAIP-like MapTiler outdoor vector basemap by default when a MapTiler key is configured', () => {
    const options = getBaseMapOptions({ maptilerKey: 'test-key' });

    expect(options.baseSource).toBe('maptiler-vector');
    expect(options.baseStyleId).toBe('outdoor-v2');
    expect(options.baseStyleUrl).toBe('https://api.maptiler.com/maps/outdoor-v2/style.json?key=test-key');
    expect(options.rasterFallback).toEqual({
      tilesUrl: 'https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=test-key',
      attribution: 'MapTiler and OpenStreetMap contributors',
      tileSize: 512,
    });
    expect(options.backgroundColor).toBe('#f3f0e8');
  });

  it('allows safe MapTiler style overrides for later tuning', () => {
    const options = getBaseMapOptions({
      maptilerKey: 'test-key',
      maptilerStyleId: 'outdoor-v2',
    });

    expect(options.baseStyleId).toBe('outdoor-v2');
    expect(options.baseStyleUrl).toContain('/maps/outdoor-v2/style.json');
  });

  it('strips dotenv quotes from MapTiler keys before building provider URLs', () => {
    const options = getBaseMapOptions({ maptilerKey: '"quoted-key"' });

    expect(options.baseStyleUrl).toBe('https://api.maptiler.com/maps/outdoor-v2/style.json?key=quoted-key');
    expect(options.rasterFallback.tilesUrl).toBe('https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=quoted-key');
  });

  it('falls back to the default outdoor vector basemap for unsafe style overrides', () => {
    expect(normalizeMaptilerBaseStyleId('../secret')).toBe('outdoor-v2');
    expect(normalizeMaptilerBaseStyleId('')).toBe('outdoor-v2');
  });

  it('uses OpenStreetMap raster tiles when MapTiler is not configured', () => {
    const options = getBaseMapOptions({});

    expect(options.baseSource).toBe('openstreetmap-raster');
    expect(options.baseStyleId).toBe('openstreetmap-standard');
    expect(options.baseStyleUrl).toBeUndefined();
    expect(options.rasterFallback).toEqual({
      tilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: 'OpenStreetMap contributors',
      tileSize: 256,
    });
  });
});
