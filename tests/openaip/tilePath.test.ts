import { describe, expect, it } from 'vitest';
import { convertOpenAipStyle } from '@/lib/openaip/styleConverter';
import { normalizeOpenAipTilePath } from '@/lib/openaip/tilePath';

describe('OpenAIP tile path handling', () => {
  it('accepts direct z/x/y tile paths', () => {
    expect(normalizeOpenAipTilePath(['8', '147', '147.pbf'])).toBe('8/147/147.pbf');
  });

  it('strips optional style source prefixes before proxying upstream', () => {
    expect(normalizeOpenAipTilePath(['openaip-data', '8', '147', '147.pbf'])).toBe('8/147/147.pbf');
  });

  it('rejects malformed tile paths', () => {
    expect(normalizeOpenAipTilePath(['openaip-data', '8', '147'])).toBeNull();
    expect(normalizeOpenAipTilePath(['..', '8', '147', '147.pbf'])).toBeNull();
    expect(normalizeOpenAipTilePath(['8', '147', '147.png'])).toBeNull();
  });

  it('rewrites OpenAIP vector sources to coordinate-only proxy URLs', () => {
    const style = convertOpenAipStyle(
      {
        version: 8,
        sources: {
          'openaip-data': {
            type: 'vector',
            url: 'https://api.tiles.openaip.net/api/data/openaip.json',
          },
        },
        layers: [
          {
            id: 'airspace_ctr_border',
            type: 'line',
            source: 'openaip-data',
            'source-layer': 'airspaces',
            paint: {
              'line-dasharray': {
                stops: [
                  [0, [3, 1]],
                  [12, [12, 4]],
                ],
              },
            },
          },
        ],
      },
      {
        spriteUrl: 'https://example.test/sprite',
        glyphsUrl: 'https://example.test/fonts/{fontstack}/{range}.pbf',
        tilesProxyUrl: 'https://example.test/api/openaip/tiles',
        baseTilesUrl: 'https://example.test/base/{z}/{x}/{y}.png',
        baseAttribution: 'test',
        baseTileSize: 256,
      }
    );

    expect((style.sources['openaip-data'] as { tiles: string[] }).tiles).toEqual([
      'https://example.test/api/openaip/tiles/{z}/{x}/{y}.pbf',
    ]);
    expect(style.layers.some((layer) => layer.id === 'airspace_ctr_border')).toBe(true);
    expect(style.layers.find((layer) => layer.id === 'airspace_ctr_border')?.paint?.['line-dasharray']).toEqual([
      'step',
      ['zoom'],
      ['literal', [3, 1]],
      12,
      ['literal', [12, 4]],
    ]);
  });
});
