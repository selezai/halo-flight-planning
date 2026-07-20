import { describe, expect, it } from 'vitest';
import {
  chooseSnapWaypoint,
  getNearestRouteLegIndex,
  insertWaypointAtRouteIndex,
} from '@/lib/planning/rubberBandRoute';
import type { Waypoint } from '@/types/planning';

const a = waypoint('a', [0, 0]);
const b = waypoint('b', [1, 0]);
const c = waypoint('c', [1, 1]);

describe('rubber-band route helpers', () => {
  it('finds the nearest leg for an inserted route point', () => {
    expect(getNearestRouteLegIndex([a, b, c], [0.5, 0.05])).toBe(0);
    expect(getNearestRouteLegIndex([a, b, c], [0.95, 0.7])).toBe(1);
  });

  it('inserts a waypoint at a clamped route index', () => {
    const inserted = waypoint('inserted', [0.5, 0]);

    expect(insertWaypointAtRouteIndex([a, b], inserted, 1).map((item) => item.id)).toEqual(['a', 'inserted', 'b']);
    expect(insertWaypointAtRouteIndex([a, b], inserted, 99).map((item) => item.id)).toEqual(['a', 'b', 'inserted']);
  });

  it('snaps dropped point to nearest waypoint within threshold', () => {
    const snap = chooseSnapWaypoint([0.01, 0.01], [
      waypoint('far', [1, 1]),
      waypoint('near', [0.012, 0.012]),
    ], 2);

    expect(snap?.id).toBe('near');
    expect(chooseSnapWaypoint([0.01, 0.01], [waypoint('far', [1, 1])], 1)).toBeNull();
  });
});

function waypoint(id: string, coordinates: [number, number]): Waypoint {
  return {
    id,
    type: 'user',
    name: id,
    coordinates,
  };
}
