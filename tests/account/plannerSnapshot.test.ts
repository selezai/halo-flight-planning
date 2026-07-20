import { describe, expect, it } from 'vitest';
import {
  buildPlannerSnapshotPayload,
  extractPlannerSnapshotState,
  MAX_PLANNER_SNAPSHOT_BYTES,
  mergePlannerSnapshotStates,
  parsePlannerSnapshotPayload,
} from '@/lib/account/plannerSnapshot';

describe('planner snapshot helpers', () => {
  it('extracts only persisted Halo planner fields from a Zustand state object', () => {
    const snapshot = extractPlannerSnapshotState({
      routeName: 'FAOR to FALA',
      cruiseAltitudeFt: 6500,
      center: [28, -26],
      waypoints: [
        { id: 'faor', type: 'airport', name: 'O.R. Tambo', coordinates: [28.246, -26.1337] },
      ],
      setRouteName: () => undefined,
      selectedFeature: { secret: 'not persisted' },
    });

    expect(snapshot).toEqual({
      routeName: 'FAOR to FALA',
      cruiseAltitudeFt: 6500,
      center: [28, -26],
      waypoints: [
        { id: 'faor', type: 'airport', name: 'O.R. Tambo', coordinates: [28.246, -26.1337] },
      ],
    });
    expect(snapshot).not.toHaveProperty('setRouteName');
    expect(snapshot).not.toHaveProperty('selectedFeature');
  });

  it('builds a versioned browser snapshot payload', () => {
    const payload = buildPlannerSnapshotPayload({
      routeName: 'Training nav',
      routeNotes: 'Check controlled airspace',
    }, new Date('2026-07-20T10:00:00Z'));

    expect(payload).toEqual({
      version: 1,
      savedAt: '2026-07-20T10:00:00.000Z',
      source: 'halo-browser',
      state: {
        routeName: 'Training nav',
        routeNotes: 'Check controlled airspace',
      },
    });
  });

  it('merges account and local data with local route data winning and emergency sites unioned', () => {
    const merged = mergePlannerSnapshotStates({
      routeName: 'Local route',
      waypoints: [
        { id: 'local', type: 'user', name: 'Local point', coordinates: [28.1, -26.1] },
      ],
      visibleLayers: {
        airports: true,
        airspaces: false,
      },
      weightBalanceLoading: {
        fuelGal: 28,
        stationWeights: {
          pilot: 180,
        },
      },
      emergencyLandingSites: [
        { id: 'site-2', name: 'Local field', coordinates: [28.3, -26.3], suitability: 'fair' },
      ],
    }, {
      routeName: 'Remote route',
      waypoints: [
        { id: 'remote', type: 'airport', name: 'Remote airport', coordinates: [27.9, -25.9] },
      ],
      visibleLayers: {
        airports: false,
        navaids: true,
      },
      weightBalanceLoading: {
        fuelGal: 20,
        stationWeights: {
          passenger: 150,
        },
      },
      emergencyLandingSites: [
        { id: 'site-1', name: 'Remote field', coordinates: [28.2, -26.2], suitability: 'good' },
      ],
    });

    expect(merged.routeName).toBe('Local route');
    expect(merged.waypoints).toEqual([
      { id: 'local', type: 'user', name: 'Local point', coordinates: [28.1, -26.1] },
    ]);
    expect(merged.visibleLayers).toEqual({
      airports: true,
      navaids: true,
      airspaces: false,
    });
    expect(merged.weightBalanceLoading).toEqual({
      fuelGal: 28,
      stationWeights: {
        passenger: 150,
        pilot: 180,
      },
    });
    expect(merged.emergencyLandingSites).toHaveLength(2);
  });

  it('rejects invalid or oversized snapshots before persistence', () => {
    expect(() => parsePlannerSnapshotPayload({
      version: 2,
      savedAt: '2026-07-20T10:00:00.000Z',
      source: 'halo-browser',
      state: {},
    })).toThrow();

    expect(() => parsePlannerSnapshotPayload({
      version: 1,
      savedAt: 'not-a-date',
      source: 'halo-browser',
      state: {},
    })).toThrow();

    expect(() => parsePlannerSnapshotPayload({
      version: 1,
      savedAt: '2026-07-20T10:00:00.000Z',
      source: 'halo-browser',
      state: {
        routeNotes: 'x'.repeat(MAX_PLANNER_SNAPSHOT_BYTES),
      },
    })).toThrow();
  });
});
