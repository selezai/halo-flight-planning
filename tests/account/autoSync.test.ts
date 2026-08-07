import { describe, expect, it } from 'vitest';
import {
  chooseAccountSyncRestoreState,
  createPlannerSnapshotFingerprint,
  DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
  hasLocalPlannerSnapshotStorage,
  hasMeaningfulLocalPlannerSnapshot,
  shouldSaveAccountSyncRestoreState,
} from '@/lib/account/autoSync';

describe('account auto sync helpers', () => {
  it('restores the remote snapshot directly when browser planner storage was cleared', () => {
    const restored = chooseAccountSyncRestoreState({
      hasLocalPersistedState: false,
      localState: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      remoteState: {
        routeName: 'Remote saved route',
        waypoints: [
          { id: 'remote-wp', type: 'user', name: 'Remote point', coordinates: [28.1, -26.1] },
        ],
        activeAircraft: {
          id: 'remote-aircraft',
          registration: 'ZS-REM',
          type: 'PA-28',
          name: 'Remote aircraft',
          cruiseSpeedKts: 120,
          fuelBurnGph: 10,
          usableFuelGal: 48,
          reserveMinutes: 45,
          contingencyPercent: 10,
          magneticVariationDeg: -24,
          compassDeviationDeg: 0,
          glideRatio: 9,
          weightBalance: { units: 'imperial', setupStatus: 'needs-poh', fuel: {}, stations: [], envelope: [] },
        },
      },
    });

    expect(restored.routeName).toBe('Remote saved route');
    expect(restored.waypoints).toHaveLength(1);
    expect(restored.activeAircraft?.registration).toBe('ZS-REM');
  });

  it('does not let a persisted default local store overwrite remote route data', () => {
    const restored = chooseAccountSyncRestoreState({
      hasLocalPersistedState: true,
      localState: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      remoteState: {
        routeName: 'Remote saved route',
        cruiseAltitudeFt: 7500,
        waypoints: [
          { id: 'remote-wp', type: 'user', name: 'Remote point', coordinates: [28.1, -26.1] },
        ],
      },
    });

    expect(restored.routeName).toBe('Remote saved route');
    expect(restored.cruiseAltitudeFt).toBe(7500);
    expect(restored.waypoints).toHaveLength(1);
  });

  it('merges remote account data when local planner storage has real edits', () => {
    const localState = {
      ...DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      routeName: 'Local route',
      waypoints: [
        { id: 'local-wp', type: 'user', name: 'Local point', coordinates: [28.2, -26.2] },
      ],
    };
    const remoteState = {
      routeName: 'Remote route',
      missionLibrary: [
        { id: 'remote-mission', name: 'Remote mission', status: 'ready', state: { routeName: 'Remote route' } },
      ],
      emergencyLandingSites: [
        { id: 'remote-site', name: 'Remote field', coordinates: [28.3, -26.3], suitability: 'good' },
      ],
    };
    const restored = chooseAccountSyncRestoreState({
      hasLocalPersistedState: true,
      localState,
      remoteState,
    });

    expect(restored.routeName).toBe('Local route');
    expect(restored.waypoints).toEqual([
      { id: 'local-wp', type: 'user', name: 'Local point', coordinates: [28.2, -26.2] },
    ]);
    expect(restored.missionLibrary?.map((mission) => mission.id)).toEqual(['remote-mission']);
    expect(restored.emergencyLandingSites?.map((site) => site.id)).toEqual(['remote-site']);
    expect(shouldSaveAccountSyncRestoreState({
      hasLocalPersistedState: true,
      localState,
      remoteState,
    })).toBe(true);
  });

  it('does not save the restored state again when remote data is the winner unchanged', () => {
    expect(shouldSaveAccountSyncRestoreState({
      hasLocalPersistedState: false,
      localState: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      remoteState: {
        routeName: 'Remote route',
      },
    })).toBe(false);

    expect(shouldSaveAccountSyncRestoreState({
      hasLocalPersistedState: true,
      localState: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      remoteState: {
        routeName: 'Remote route',
      },
    })).toBe(false);
  });

  it('detects meaningful local edits and ignores invalid storage values', () => {
    expect(hasMeaningfulLocalPlannerSnapshot(DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE)).toBe(false);
    expect(hasMeaningfulLocalPlannerSnapshot({
      ...DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      routeNotes: 'Call tower before startup',
    })).toBe(true);
    expect(hasLocalPlannerSnapshotStorage(null)).toBe(false);
    expect(hasLocalPlannerSnapshotStorage('not-json')).toBe(false);
    expect(hasLocalPlannerSnapshotStorage(JSON.stringify({ state: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE, version: 3 }))).toBe(true);
  });

  it('fingerprints only account snapshot fields and ignores transient UI/navigation state', () => {
    const baseline = createPlannerSnapshotFingerprint({
      routeName: 'Training nav',
      selectedFeature: { id: 'airspace-1' },
      activeRoute: { status: 'active' },
      locationTracking: { status: 'tracking' },
      sidebarOpen: true,
    });
    const changedTransientState = createPlannerSnapshotFingerprint({
      routeName: 'Training nav',
      selectedFeature: { id: 'airport-2' },
      activeRoute: { status: 'paused' },
      locationTracking: { status: 'error' },
      sidebarOpen: false,
    });

    expect(changedTransientState).toBe(baseline);
  });
});
