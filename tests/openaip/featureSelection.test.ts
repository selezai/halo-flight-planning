import { describe, expect, it } from 'vitest';
import {
  buildFeatureSelectionStack,
  featureSelectionKey,
} from '@/lib/openaip/featureSelection';

describe('OpenAIP clicked feature selection', () => {
  it('orders aviation point features before airspaces when a click hits stacked records', () => {
    const stack = buildFeatureSelectionStack([
      {
        layer: { id: 'airspace_ctr_fill', type: 'fill' },
        sourceLayer: 'airspaces',
        properties: {
          source_id: 'asp-1',
          feature_type: 'airspace',
          name: 'CTR FAOR',
          type: 'ctr',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[28, -26], [29, -26], [29, -27], [28, -27], [28, -26]]],
        },
      },
      {
        layer: { id: 'navaid_symbol', type: 'symbol' },
        sourceLayer: 'navaids',
        properties: {
          source_id: 'nav-1',
          feature_type: 'navaid',
          name: 'LANSERIA',
          identifier: 'LIV',
          type: 'vor_dme',
        },
        geometry: {
          type: 'Point',
          coordinates: [27.913513, -25.948784],
        },
      },
      {
        layer: { id: 'airport_with_code', type: 'symbol' },
        sourceLayer: 'airports',
        properties: {
          source_id: 'apt-1',
          feature_type: 'airport',
          name: 'O R Tambo Intl',
          icao_code: 'FAOR',
          type: 'intl_apt',
        },
        geometry: {
          type: 'Point',
          coordinates: [28.246, -26.133],
        },
      },
    ]);

    expect(stack.map((feature) => feature.type)).toEqual(['airport', 'navaid', 'airspace']);
    expect(stack[0].icao).toBe('FAOR');
    expect(stack[1].identifier).toBe('LIV');
    expect(stack[2].name).toBe('CTR FAOR');
  });

  it('dedupes repeated airspace fill and border records by OpenAIP source ID', () => {
    const stack = buildFeatureSelectionStack([
      {
        layer: { id: 'airspace_ctr_fill', type: 'fill' },
        sourceLayer: 'airspaces',
        properties: {
          source_id: 'asp-1',
          feature_type: 'airspace',
          name: 'CTR FAOR',
          type: 'ctr',
        },
      },
      {
        layer: { id: 'airspace_ctr_border', type: 'line' },
        sourceLayer: 'airspaces_border_offset',
        properties: {
          source_id: 'asp-1',
          feature_type: 'airspace',
          name: 'CTR FAOR',
          type: 'ctr',
        },
      },
    ]);

    expect(stack).toHaveLength(1);
    expect(stack[0].type).toBe('airspace');
    expect(stack[0].name).toBe('CTR FAOR');
  });

  it('selects an airspace when airspace is the only clicked aviation feature', () => {
    const stack = buildFeatureSelectionStack([
      {
        layer: { id: 'airspace_tma_fill', type: 'fill' },
        sourceLayer: 'airspaces',
        properties: {
          source_id: 'asp-2',
          feature_type: 'airspace',
          name: 'TMA FALA A',
          type: 'tma',
          icao_class: 'c',
        },
      },
    ]);

    expect(stack).toHaveLength(1);
    expect(stack[0].type).toBe('airspace');
    expect(stack[0].airspaceType).toBe('TMA');
    expect(featureSelectionKey(stack[0])).toBe('airspace:asp-2');
  });
});
