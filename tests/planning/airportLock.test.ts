import { describe, expect, it } from 'vitest';
import {
  applyAirportLockToWaypoint,
  chooseNearestAirportLock,
} from '@/lib/planning/airportLock';
import type { Waypoint } from '@/types/planning';

const waypoint = (overrides: Partial<Waypoint>): Waypoint => ({
  id: overrides.id ?? 'wp',
  type: overrides.type ?? 'user',
  name: overrides.name ?? 'Waypoint',
  ident: overrides.ident,
  coordinates: overrides.coordinates ?? [28, -26],
  sourceId: overrides.sourceId,
  elevationFt: overrides.elevationFt,
  notes: overrides.notes,
});

describe('airport lock helpers', () => {
  it('chooses the nearest airport candidate within range', () => {
    const result = chooseNearestAirportLock([28.01, -26.01], [
      waypoint({
        id: 'far-airport',
        type: 'airport',
        ident: 'FAR',
        coordinates: [28.5, -26.5],
      }),
      waypoint({
        id: 'near-airport',
        type: 'airport',
        ident: 'NEAR',
        coordinates: [28.012, -26.012],
      }),
      waypoint({
        id: 'navaid',
        type: 'navaid',
        ident: 'NAV',
        coordinates: [28.011, -26.011],
      }),
    ]);

    expect(result?.waypoint.ident).toBe('NEAR');
    expect(result?.distanceNm).toBeLessThan(1);
  });

  it('returns null when no airport is close enough', () => {
    const result = chooseNearestAirportLock([28.01, -26.01], [
      waypoint({
        id: 'far-airport',
        type: 'airport',
        ident: 'FAR',
        coordinates: [29.5, -27.5],
      }),
    ], 3);

    expect(result).toBeNull();
  });

  it('locks a waypoint to airport identity and coordinates while preserving id and notes', () => {
    const routePoint = waypoint({
      id: 'route-point',
      type: 'user',
      name: 'Checkpoint',
      ident: 'WP02',
      coordinates: [28.01, -26.01],
      notes: 'Keep this note',
    });
    const airport = waypoint({
      id: 'airport-candidate',
      type: 'airport',
      name: 'Lanseria',
      ident: 'FALA',
      coordinates: [27.926, -25.939],
      sourceId: 'openaip-fala',
      elevationFt: 4517,
    });

    expect(applyAirportLockToWaypoint(routePoint, airport)).toEqual({
      ...routePoint,
      type: 'airport',
      name: 'Lanseria',
      ident: 'FALA',
      coordinates: [27.926, -25.939],
      sourceId: 'openaip-fala',
      elevationFt: 4517,
    });
  });
});
