import { describe, expect, it } from 'vitest';
import { convertOpenAipStyle, getClickableLayers } from '@/lib/openaip/styleConverter';
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
            id: 'basemap-poi-label',
            type: 'symbol',
            source: 'composite',
            'source-layer': 'poi_label',
            layout: {
              'icon-image': 'wetland',
            },
          },
          {
            id: 'airport_with_code',
            type: 'symbol',
            source: 'openaip-data',
            'source-layer': 'airports',
            layout: {
              'icon-image': {
                stops: [
                  [7, 'apt-dot'],
                  [9, '{type}-medium'],
                ],
              },
              'text-field': {
                stops: [
                  [7, '{icao_code}'],
                  [9, '{name_label_full}'],
                ],
              },
              'text-offset': {
                stops: [
                  [7, [0, 1.5]],
                  [9, [0, 2.5]],
                ],
              },
              'text-font': {
                stops: [
                  [7, ['Roboto Mono Light', 'Arial Unicode MS Regular']],
                  [9, ['Roboto Mono Regular', 'Arial Unicode MS Regular']],
                ],
              },
            },
          },
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
          {
            id: 'reporting_point',
            type: 'symbol',
            source: 'openaip-data',
            'source-layer': 'reporting_points',
            layout: {
              'text-field': {
                stops: [[11, '{name}']],
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
    expect(style.layers.some((layer) => layer.id === 'basemap-poi-label')).toBe(false);
    expect(style.layers.some((layer) => layer.id === 'airport_with_code')).toBe(true);
    expect(getClickableLayers(style)[0]).toBe('airport_with_code');
    expect(style.layers.find((layer) => layer.id === 'airspace_ctr_border')?.paint?.['line-dasharray']).toEqual([
      'step',
      ['zoom'],
      ['literal', [3, 1]],
      12,
      ['literal', [12, 4]],
    ]);
    expect(style.layers.find((layer) => layer.id === 'airport_with_code')?.layout?.['text-field']).toEqual([
      'step',
      ['zoom'],
      ['coalesce', ['to-string', ['get', 'icao_code']], ''],
      9,
      ['coalesce', ['to-string', ['get', 'name_label_full']], ''],
    ]);
    expect(style.layers.find((layer) => layer.id === 'airport_with_code')?.layout?.['text-offset']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      7,
      ['literal', [0, 1.5]],
      9,
      ['literal', [0, 2.5]],
    ]);
    expect(style.layers.find((layer) => layer.id === 'airport_with_code')?.layout?.['text-font']).toEqual([
      'step',
      ['zoom'],
      ['literal', ['Roboto Mono Light', 'Arial Unicode MS Regular']],
      9,
      ['literal', ['Roboto Mono Regular', 'Arial Unicode MS Regular']],
    ]);
    expect(style.layers.find((layer) => layer.id === 'reporting_point')?.layout?.['text-field']).toEqual([
      'coalesce',
      ['to-string', ['get', 'name']],
      '',
    ]);
  });
});
