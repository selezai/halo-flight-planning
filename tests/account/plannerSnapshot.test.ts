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
      activeMissionId: 'mission-local',
      aircraftTrackingEnabled: true,
      missionLibrary: [
        {
          id: 'mission-local',
          name: 'FAOR to FALA',
          status: 'draft',
          createdAt: '2026-07-21T08:00:00.000Z',
          updatedAt: '2026-07-21T08:00:00.000Z',
          state: { routeName: 'FAOR to FALA' },
        },
      ],
      center: [28, -26],
      selectedRouteCandidateId: 'current-route',
      weightBalanceLoadTemplates: [
        {
          id: 'template-1',
          name: 'Dual load',
          fuelGal: 38,
          stationWeights: { pilot: 180 },
          lockedStationWeights: { baggage: 10 },
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-01T08:00:00.000Z',
        },
      ],
      waypoints: [
        { id: 'faor', type: 'airport', name: 'O.R. Tambo', coordinates: [28.246, -26.1337] },
      ],
      setRouteName: () => undefined,
      selectedFeature: { secret: 'not persisted' },
    });

    expect(snapshot).toEqual({
      routeName: 'FAOR to FALA',
      cruiseAltitudeFt: 6500,
      activeMissionId: 'mission-local',
      aircraftTrackingEnabled: true,
      missionLibrary: [
        {
          id: 'mission-local',
          name: 'FAOR to FALA',
          status: 'draft',
          createdAt: '2026-07-21T08:00:00.000Z',
          updatedAt: '2026-07-21T08:00:00.000Z',
          state: { routeName: 'FAOR to FALA' },
        },
      ],
      center: [28, -26],
      selectedRouteCandidateId: 'current-route',
      weightBalanceLoadTemplates: [
        {
          id: 'template-1',
          name: 'Dual load',
          fuelGal: 38,
          stationWeights: { pilot: 180 },
          lockedStationWeights: { baggage: 10 },
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-01T08:00:00.000Z',
        },
      ],
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
      aircraftTrackingEnabled: false,
      weightBalanceLoading: {
        fuelGal: 28,
        stationWeights: {
          pilot: 180,
        },
      },
      selectedRouteCandidateId: 'current-route',
      weightBalanceLoadTemplates: [
        {
          id: 'local-load',
          name: 'Local load',
          fuelGal: 28,
          stationWeights: { pilot: 180 },
          lockedStationWeights: {},
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-01T08:00:00.000Z',
        },
      ],
      emergencyLandingSites: [
        { id: 'site-2', name: 'Local field', coordinates: [28.3, -26.3], suitability: 'fair' },
      ],
      activeMissionId: 'local-mission',
      missionLibrary: [
        { id: 'local-mission', name: 'Local mission', status: 'draft', state: { routeName: 'Local route' } },
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
      aircraftTrackingEnabled: true,
      weightBalanceLoading: {
        fuelGal: 20,
        stationWeights: {
          passenger: 150,
        },
      },
      selectedRouteCandidateId: 'direct-route',
      weightBalanceLoadTemplates: [
        {
          id: 'remote-load',
          name: 'Remote load',
          fuelGal: 20,
          stationWeights: { passenger: 150 },
          lockedStationWeights: {},
          createdAt: '2026-09-01T07:00:00.000Z',
          updatedAt: '2026-09-01T07:00:00.000Z',
        },
      ],
      emergencyLandingSites: [
        { id: 'site-1', name: 'Remote field', coordinates: [28.2, -26.2], suitability: 'good' },
      ],
      activeMissionId: 'remote-mission',
      missionLibrary: [
        { id: 'remote-mission', name: 'Remote mission', status: 'ready', state: { routeName: 'Remote route' } },
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
    expect(merged.aircraftTrackingEnabled).toBe(false);
    expect(merged.weightBalanceLoading).toEqual({
      fuelGal: 28,
      stationWeights: {
        passenger: 150,
        pilot: 180,
      },
    });
    expect(merged.selectedRouteCandidateId).toBe('current-route');
    expect(merged.weightBalanceLoadTemplates?.map((template) => template.id)).toEqual([
      'remote-load',
      'local-load',
    ]);
    expect(merged.emergencyLandingSites).toHaveLength(2);
    expect(merged.activeMissionId).toBe('local-mission');
    expect(merged.missionLibrary).toHaveLength(2);
    expect(merged.missionLibrary?.map((mission) => mission.id)).toEqual([
      'remote-mission',
      'local-mission',
    ]);
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
