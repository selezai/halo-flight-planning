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
            id: 'land',
            type: 'background',
            paint: {
              'background-color': '#f3efe5',
            },
          },
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
        rasterBaseMap: {
          tilesUrl: 'https://example.test/base/{z}/{x}/{y}.png',
          attribution: 'test',
          tileSize: 256,
        },
      }
    );

    expect((style.sources['openaip-data'] as { tiles: string[] }).tiles).toEqual([
      'https://example.test/api/openaip/tiles/{z}/{x}/{y}.pbf',
    ]);
    expect(style.layers.some((layer) => layer.id === 'land')).toBe(false);
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

  it('adds vector ground layers below OpenAIP aviation layers when configured', () => {
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
            id: 'airport_with_code',
            type: 'symbol',
            source: 'openaip-data',
            'source-layer': 'airports',
          },
        ],
      },
      {
        spriteUrl: 'https://example.test/sprite',
        glyphsUrl: 'https://example.test/fonts/{fontstack}/{range}.pbf',
        tilesProxyUrl: 'https://example.test/api/openaip/tiles',
        baseMapStyle: {
          sources: {
            maptiler_planet: {
              type: 'vector',
              url: 'https://example.test/maptiler/tiles.json',
            },
          },
          layers: [
            {
              id: 'Background',
              type: 'background',
              paint: {
                'background-color': '#ffffff',
              },
            },
            {
              id: 'City labels',
              type: 'symbol',
              source: 'maptiler_planet',
              'source-layer': 'place',
              minzoom: 5,
              maxzoom: 16,
              layout: {
                'icon-image': 'circle-dot',
                'text-field': '{name:en}',
              },
            },
            {
              id: 'Town labels',
              type: 'symbol',
              source: 'maptiler_planet',
              'source-layer': 'place',
              minzoom: 6,
              maxzoom: 16,
              layout: {
                'icon-image': 'dot',
                'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
              },
            },
            {
              id: 'Airport labels',
              type: 'symbol',
              source: 'maptiler_planet',
              'source-layer': 'aerodrome_label',
              minzoom: 8,
              layout: {
                'text-field': '{name}',
              },
            },
          ],
        },
        rasterBaseMap: {
          tilesUrl: 'https://example.test/basic/{z}/{x}/{y}.png',
          attribution: 'test',
          tileSize: 512,
        },
        backgroundColor: '#f3f0e8',
      }
    );

    expect(style.sources['halo-raster-base']).toBeUndefined();
    expect(style.sources.maptiler_planet).toEqual({
      type: 'vector',
      url: 'https://example.test/maptiler/tiles.json',
    });
    expect(style.layers.slice(0, 3)).toEqual([
      {
        id: 'halo-ground-Background',
        type: 'background',
        paint: {
          'background-color': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            'hsl(35, 25%, 93%)',
            13,
            'hsl(35, 9%, 91%)',
          ],
        },
      },
      {
        id: 'halo-ground-City labels',
        type: 'symbol',
        source: 'maptiler_planet',
        'source-layer': 'place',
        minzoom: 8,
        maxzoom: 15,
        layout: {
          'text-field': ['coalesce', ['to-string', ['get', 'name:en']], ''],
        },
      },
      {
        id: 'halo-ground-Town labels',
        type: 'symbol',
        source: 'maptiler_planet',
        'source-layer': 'place',
        minzoom: 9,
        maxzoom: 15,
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        },
      },
    ]);
    expect(style.layers.some((layer) => layer.id === 'halo-ground-Airport labels')).toBe(false);
    expect(style.layers[3]?.id).toBe('airport_with_code');
  });

  it('falls back to a full-zoom raster base only when no vector basemap style is available', () => {
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
            id: 'airport_with_code',
            type: 'symbol',
            source: 'openaip-data',
            'source-layer': 'airports',
          },
        ],
      },
      {
        spriteUrl: 'https://example.test/sprite',
        glyphsUrl: 'https://example.test/fonts/{fontstack}/{range}.pbf',
        tilesProxyUrl: 'https://example.test/api/openaip/tiles',
        rasterBaseMap: {
          tilesUrl: 'https://example.test/basic/{z}/{x}/{y}.png',
          attribution: 'test',
          tileSize: 512,
        },
        backgroundColor: '#f3f0e8',
      }
    );

    expect((style.sources['halo-raster-base'] as { tiles: string[] }).tiles).toEqual([
      'https://example.test/basic/{z}/{x}/{y}.png',
    ]);
    expect(style.layers.slice(0, 2)).toEqual([
      {
        id: 'halo-ground-background',
        type: 'background',
        minzoom: 0,
        paint: {
          'background-color': '#f3f0e8',
        },
      },
      {
        id: 'halo-raster-base',
        type: 'raster',
        source: 'halo-raster-base',
        minzoom: 0,
        maxzoom: 22,
      },
    ]);
    expect(style.layers[2]?.id).toBe('airport_with_code');
  });
});
