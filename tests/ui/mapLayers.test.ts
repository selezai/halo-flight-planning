import { describe, expect, it } from 'vitest';
import {
  countEnabledMapLayers,
  formatMapLayerName,
  getOrderedMapLayerEntries,
} from '@/lib/ui/mapLayers';

describe('map layer UI helpers', () => {
  it('formats known aviation layer labels for the map overlay', () => {
    expect(formatMapLayerName('airports')).toBe('Airports');
    expect(formatMapLayerName('reportingPoints')).toBe('Reporting points');
    expect(formatMapLayerName('rcAirfields')).toBe('RC airfields');
  });

  it('keeps layer controls in a stable aviation-first order', () => {
    const entries = getOrderedMapLayerEntries({
      rcAirfields: true,
      airspaces: false,
      airports: true,
      navaids: true,
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'airports',
      'navaids',
      'airspaces',
      'rcAirfields',
    ]);
  });

  it('counts active map layers for the floating map control summary', () => {
    expect(countEnabledMapLayers({
      airports: true,
      navaids: false,
      airspaces: true,
    })).toBe(2);
  });
});
