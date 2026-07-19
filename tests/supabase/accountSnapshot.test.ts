import { describe, expect, it } from 'vitest';
import {
  accountSnapshotRequestSchema,
  createAccountSnapshot,
  mergeAccountSnapshotIntoPlannerState,
} from '@/lib/supabase/accountSnapshot';
import { DEFAULT_AIRCRAFT, DEFAULT_PERSONAL_MINIMUMS } from '@/lib/planning/aircraft';
import type { Waypoint } from '@/types/planning';

const waypoint: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O. R. Tambo International',
  coordinates: [28.246, -26.1337],
};

const visibleLayers = {
  airports: true,
  navaids: true,
  airspaces: true,
  reportingPoints: true,
  obstacles: true,
  hotspots: false,
  hangGlidings: false,
  rcAirfields: false,
};

describe('Supabase account snapshot helpers', () => {
  it('serializes local planner data for owner-scoped account sync', () => {
    const snapshot = createAccountSnapshot({
      routeName: 'FAOR local',
      routeNotes: 'Check official briefing.',
      departureTime: '2026-07-19T15:00',
      cruiseAltitudeFt: 6500,
      waypoints: [waypoint],
      activeAircraft: DEFAULT_AIRCRAFT,
      personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
      visibleLayers,
    });

    expect(snapshot.route.name).toBe('FAOR local');
    expect(snapshot.route.routeId).toBe('primary');
    expect(snapshot.route.waypoints).toEqual([waypoint]);
    expect(snapshot.aircraft.id).toBe(DEFAULT_AIRCRAFT.id);
    expect(snapshot.updatedAt).toBeTruthy();
  });

  it('validates incoming snapshot payloads before server-side persistence', () => {
    const snapshot = createAccountSnapshot({
      routeName: 'Valid route',
      routeNotes: '',
      departureTime: '',
      cruiseAltitudeFt: 5500,
      waypoints: [waypoint],
      activeAircraft: DEFAULT_AIRCRAFT,
      personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
      visibleLayers,
    });

    expect(accountSnapshotRequestSchema.safeParse({ snapshot }).success).toBe(true);
    expect(accountSnapshotRequestSchema.safeParse({
      snapshot: {
        ...snapshot,
        route: {
          ...snapshot.route,
          waypoints: [{ ...waypoint, coordinates: [300, -26] }],
        },
      },
    }).success).toBe(false);
  });

  it('merges a cloud snapshot into local planner state without retaining transient reviews', () => {
    const snapshot = createAccountSnapshot({
      routeName: 'Cloud route',
      routeNotes: 'Merged',
      departureTime: '2026-07-19T16:00',
      cruiseAltitudeFt: 7500,
      waypoints: [waypoint],
      activeAircraft: DEFAULT_AIRCRAFT,
      personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
      visibleLayers,
    });

    expect(mergeAccountSnapshotIntoPlannerState(snapshot)).toMatchObject({
      routeName: 'Cloud route',
      routeNotes: 'Merged',
      cruiseAltitudeFt: 7500,
      waypoints: [waypoint],
      visibleLayers,
    });
  });
});
