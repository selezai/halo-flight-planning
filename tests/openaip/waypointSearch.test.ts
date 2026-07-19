import { describe, expect, it } from 'vitest';
import { normalizeOpenAipWaypointSearchResults } from '@/lib/openaip/waypointSearch';

describe('OpenAIP waypoint search normalization', () => {
  it('normalizes airport and navaid Core API records into route waypoints', () => {
    const waypoints = normalizeOpenAipWaypointSearchResults({
      limit: 10,
      airports: [{
        _id: 'airport-1',
        name: 'O.R. Tambo International',
        icaoCode: 'FAOR',
        geometry: { type: 'Point', coordinates: [28.246, -26.1337] },
        elevation: { value: 1694, unit: 0 },
      }],
      navaids: [{
        _id: 'navaid-1',
        name: 'Lanseria',
        identifier: 'LIV',
        geometry: { type: 'Point', coordinates: [27.9135, -25.9488] },
        elevation: { value: 4517, unit: 1 },
      }],
    });

    expect(waypoints).toHaveLength(2);
    expect(waypoints[0]).toMatchObject({
      id: 'openaip-airport-airport-1',
      type: 'airport',
      ident: 'FAOR',
      name: 'O.R. Tambo International',
      coordinates: [28.246, -26.1337],
      sourceId: 'airport-1',
    });
    expect(waypoints[0].elevationFt).toBe(5558);
    expect(waypoints[1]).toMatchObject({
      id: 'openaip-navaid-navaid-1',
      type: 'navaid',
      ident: 'LIV',
      name: 'Lanseria',
    });
    expect(waypoints[1].elevationFt).toBe(4517);
  });

  it('drops invalid records and dedupes stable matches', () => {
    const waypoints = normalizeOpenAipWaypointSearchResults({
      limit: 10,
      airports: [
        {
          _id: 'airport-1',
          name: 'Duplicate Airport',
          icaoCode: 'FADU',
          geometry: { type: 'Point', coordinates: [20, -30] },
        },
        {
          _id: 'airport-1',
          name: 'Duplicate Airport',
          icaoCode: 'FADU',
          geometry: { type: 'Point', coordinates: [20, -30] },
        },
        {
          _id: 'invalid',
          name: 'No geometry',
        },
      ],
      navaids: [],
    });

    expect(waypoints).toHaveLength(1);
    expect(waypoints[0].ident).toBe('FADU');
  });

  it('respects the combined result limit', () => {
    const waypoints = normalizeOpenAipWaypointSearchResults({
      limit: 1,
      airports: [{
        _id: 'airport-1',
        name: 'First',
        icaoCode: 'FAAA',
        geometry: { type: 'Point', coordinates: [20, -30] },
      }],
      navaids: [{
        _id: 'navaid-1',
        name: 'Second',
        identifier: 'BBB',
        geometry: { type: 'Point', coordinates: [21, -31] },
      }],
    });

    expect(waypoints).toHaveLength(1);
    expect(waypoints[0].ident).toBe('FAAA');
  });
});
