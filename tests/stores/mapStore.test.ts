import { beforeEach, describe, expect, it } from 'vitest';
import {
  HALO_MAP_STORE_VERSION,
  migratePersistedMapState,
  useMapStore,
} from '@/stores/mapStore';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { createUserWaypoint } from '@/lib/planning/navigation';
import {
  DEFAULT_ACTIVE_ROUTE_STATE,
  DEFAULT_LOCATION_TRACKING_STATE,
  normalizeTrackedLocation,
} from '@/lib/planning/routeTracking';
import type { ParsedFeature } from '@/types/openaip';

describe('map store route planning actions', () => {
  beforeEach(() => {
    useMapStore.setState({
      activeMissionId: 'mission-test-active',
      missionLibrary: [],
      routeName: 'Test active mission',
      waypoints: [],
      sidebarOpen: false,
      sidebarPanel: 'briefing',
      routeEditingActive: false,
      aircraftTrackingEnabled: false,
      activeRoute: DEFAULT_ACTIVE_ROUTE_STATE,
      locationTracking: DEFAULT_LOCATION_TRACKING_STATE,
      selectedFeature: null,
      selectedFeatureCandidates: [],
    });
  });

  it('adds exact map-created waypoints without opening the planner', () => {
    const waypointId = useMapStore.getState().addUserWaypoint([28.12345, -26.54321]);
    const state = useMapStore.getState();

    expect(state.sidebarOpen).toBe(false);
    expect(state.sidebarPanel).toBe('briefing');
    expect(state.waypoints).toHaveLength(1);
    expect(state.waypoints[0].id).toBe(waypointId);
    expect(state.waypoints[0].coordinates).toEqual([28.12345, -26.54321]);
  });

  it('inserts rubber-band waypoints without opening the planner', () => {
    const first = createUserWaypoint([28, -26], 1);
    const second = createUserWaypoint([29, -27], 2);
    const inserted = createUserWaypoint([28.5, -26.5], 3);

    useMapStore.setState({
      waypoints: [first, second],
      sidebarOpen: false,
      sidebarPanel: 'admin',
    });

    useMapStore.getState().insertRouteWaypoint(1, inserted);
    const state = useMapStore.getState();

    expect(state.sidebarOpen).toBe(false);
    expect(state.sidebarPanel).toBe('admin');
    expect(state.waypoints.map((waypoint) => waypoint.id)).toEqual([
      first.id,
      inserted.id,
      second.id,
    ]);
  });

  it('tracks active route editing without changing persisted planner fields', () => {
    useMapStore.getState().setRouteEditingActive(true);
    expect(useMapStore.getState().routeEditingActive).toBe(true);

    useMapStore.getState().setRouteEditingActive(false);
    expect(useMapStore.getState().routeEditingActive).toBe(false);
  });

  it('saves the current map mission directly into the mission library', () => {
    const first = createUserWaypoint([28.0, -26.0], 1);
    const second = createUserWaypoint([28.5, -26.4], 2);

    useMapStore.setState({
      activeMissionId: 'mission-current-map',
      missionLibrary: [],
      routeName: 'Current map route',
      waypoints: [first, second],
    });

    useMapStore.getState().saveActiveMission('needs-review');

    const state = useMapStore.getState();
    const savedMission = state.missionLibrary.find((mission) => mission.id === 'mission-current-map');

    expect(savedMission).toBeDefined();
    expect(state.activeMissionId).toBe('mission-current-map');
    expect(state.missionLibrary).toHaveLength(1);
    expect(savedMission?.name).toBe('Current map route');
    expect(savedMission?.status).toBe('needs-review');
    expect(savedMission?.waypointCount).toBe(2);
    expect(savedMission?.state.waypoints).toEqual([first, second]);
  });

  it('clears selected inspect features without changing the active planner panel', () => {
    const airspace: ParsedFeature = {
      type: 'airspace',
      sourceId: 'airspace-test',
      name: 'Test TMA',
    };

    useMapStore.setState({
      selectedFeature: airspace,
      selectedFeatureCandidates: [airspace],
      sidebarOpen: true,
      sidebarPanel: 'briefing',
    });

    useMapStore.getState().clearSelection();

    const state = useMapStore.getState();
    expect(state.selectedFeature).toBeNull();
    expect(state.selectedFeatureCandidates).toEqual([]);
    expect(state.sidebarOpen).toBe(true);
    expect(state.sidebarPanel).toBe('briefing');
  });

  it('starts and stops active route tracking without persisting stale planning mode', () => {
    const first = createUserWaypoint([28.246, -26.134], 1);
    const second = createUserWaypoint([27.926, -25.939], 2);

    useMapStore.setState({
      waypoints: [first, second],
      planningMode: true,
      selectedFeature: {
        type: 'airspace',
        sourceId: 'airspace-before-start',
        name: 'Before start',
      },
      selectedFeatureCandidates: [],
    });

    useMapStore.getState().startActiveRoute();

    const activeState = useMapStore.getState();
    expect(activeState.activeRoute.status).toBe('active');
    expect(activeState.activeRoute.currentLegIndex).toBe(0);
    expect(activeState.activeRoute.nextWaypointId).toBe(second.id);
    expect(activeState.activeRoute.startedAt).toBeDefined();
    expect(activeState.planningMode).toBe(false);
    expect(activeState.selectedFeature).toBeNull();

    useMapStore.getState().stopActiveRoute();

    const stoppedState = useMapStore.getState();
    expect(stoppedState.activeRoute.status).toBe('stopped');
    expect(stoppedState.activeRoute.stoppedAt).toBeDefined();
  });

  it('updates GPS tracking state and active route progress from tracked location', () => {
    const first = createUserWaypoint([28.246, -26.134], 1);
    const second = createUserWaypoint([27.926, -25.939], 2);
    const third = createUserWaypoint([28.224, -25.654], 3);

    useMapStore.setState({
      waypoints: [first, second, third],
      activeRoute: {
        status: 'active',
        startedAt: '2026-07-25T08:00:00.000Z',
        currentLegIndex: 0,
        nextWaypointId: second.id,
      },
      locationTracking: {
        ...DEFAULT_LOCATION_TRACKING_STATE,
        enabled: true,
        status: 'requesting',
      },
    });

    useMapStore.getState().setTrackedLocation(normalizeTrackedLocation({
      longitude: 27.926,
      latitude: -25.939,
      timestamp: '2026-07-25T08:30:00.000Z',
    }));

    const state = useMapStore.getState();
    expect(state.locationTracking.status).toBe('tracking');
    expect(state.locationTracking.position?.coordinates).toEqual([27.926, -25.939]);
    expect(state.activeRoute.currentLegIndex).toBe(1);
    expect(state.activeRoute.nextWaypointId).toBe(third.id);
    expect(state.activeRoute.lastPositionAt).toBe('2026-07-25T08:30:00.000Z');
  });

  it('clears stale GPS fixes when tracking is stopped or fails', () => {
    const location = normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      timestamp: '2026-07-25T08:30:00.000Z',
    });

    useMapStore.setState({
      locationTracking: {
        ...DEFAULT_LOCATION_TRACKING_STATE,
        enabled: true,
        followMode: true,
        status: 'tracking',
        position: location,
      },
    });

    useMapStore.getState().setLocationTrackingEnabled(false);

    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: false,
      followMode: false,
      status: 'idle',
      position: undefined,
    });

    useMapStore.setState({
      locationTracking: {
        ...DEFAULT_LOCATION_TRACKING_STATE,
        enabled: true,
        followMode: true,
        status: 'tracking',
        position: location,
      },
    });

    useMapStore.getState().setLocationTrackingStatus('denied', 'Location blocked');

    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: false,
      followMode: false,
      status: 'denied',
      position: undefined,
      error: 'Location blocked',
    });
  });

  it('keeps GPS tracking enabled while the browser is still acquiring a fix', () => {
    useMapStore.setState({
      locationTracking: {
        ...DEFAULT_LOCATION_TRACKING_STATE,
        enabled: true,
        followMode: true,
        status: 'requesting',
      },
    });

    useMapStore.getState().setLocationTrackingStatus(
      'requesting',
      'Location permission is enabled; GPS acquisition is still in progress.'
    );

    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: true,
      followMode: true,
      status: 'requesting',
      error: 'Location permission is enabled; GPS acquisition is still in progress.',
    });
  });

  it('persists the pilot aircraft tracking preference separately from route activation', () => {
    useMapStore.getState().setAircraftTrackingEnabled(true);

    expect(useMapStore.getState().aircraftTrackingEnabled).toBe(true);
    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: true,
      followMode: true,
      status: 'requesting',
    });

    useMapStore.getState().setLocationTrackingEnabled(false);

    expect(useMapStore.getState().aircraftTrackingEnabled).toBe(true);
    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: false,
      followMode: false,
      status: 'idle',
    });
  });

  it('makes already-active route GPS persistent without reacquiring or hiding the aircraft', () => {
    useMapStore.getState().setLocationTrackingEnabled(true);
    useMapStore.getState().setTrackedLocation({
      coordinates: [28.2, -26.1],
      accuracyM: 20,
      timestamp: '2026-07-01T12:00:00.000Z',
    });

    useMapStore.getState().setAircraftTrackingEnabled(true);

    expect(useMapStore.getState().aircraftTrackingEnabled).toBe(true);
    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: true,
      followMode: true,
      status: 'tracking',
      position: {
        coordinates: [28.2, -26.1],
      },
    });
  });

  it('keeps the aircraft fix visible when route guidance starts after aircraft tracking', () => {
    const first = createUserWaypoint([28.246, -26.134], 1);
    const second = createUserWaypoint([27.926, -25.939], 2);

    useMapStore.setState({
      waypoints: [first, second],
    });

    useMapStore.getState().setAircraftTrackingEnabled(true);
    useMapStore.getState().setTrackedLocation({
      coordinates: [28.2, -26.1],
      accuracyM: 20,
      timestamp: '2026-07-01T12:00:00.000Z',
    });
    useMapStore.getState().startActiveRoute();
    useMapStore.getState().setLocationTrackingEnabled(true);

    expect(useMapStore.getState().activeRoute.status).toBe('active');
    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: true,
      followMode: true,
      status: 'tracking',
      position: {
        coordinates: [28.2, -26.1],
      },
    });
  });

  it('disables persistent aircraft tracking after terminal permission failures', () => {
    useMapStore.getState().setAircraftTrackingEnabled(true);

    useMapStore.getState().setLocationTrackingStatus(
      'unavailable',
      'Location tracking could not start.'
    );

    expect(useMapStore.getState().aircraftTrackingEnabled).toBe(false);
    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: false,
      followMode: false,
      status: 'unavailable',
      error: 'Location tracking could not start.',
    });
  });

  it('can clear the aircraft tracking preference without stopping route-driven GPS', () => {
    useMapStore.getState().setAircraftTrackingEnabled(true);
    useMapStore.getState().setTrackedLocation({
      coordinates: [28.2, -26.1],
      accuracyM: 20,
      timestamp: '2026-07-01T12:00:00.000Z',
    });

    useMapStore.getState().setAircraftTrackingEnabled(false, { keepLocationTrackingActive: true });

    expect(useMapStore.getState().aircraftTrackingEnabled).toBe(false);
    expect(useMapStore.getState().locationTracking).toMatchObject({
      enabled: true,
      followMode: true,
      status: 'tracking',
      position: {
        coordinates: [28.2, -26.1],
      },
    });
  });

  it('sanitizes corrupt persisted planner state instead of crashing on load', () => {
    const currentWaypoint = createUserWaypoint([28.2, -26.1], 1);

    useMapStore.setState({
      waypoints: [currentWaypoint],
      activeAircraft: DEFAULT_AIRCRAFT,
    });

    expect(() => useMapStore.getState().restorePlannerSnapshotState({
      activeAircraft: null,
      center: null,
      zoom: 'bad',
      routeName: null,
      visibleLayers: {
        airports: null,
        airspaces: false,
      },
      waypoints: null,
      personalMinimums: null,
    })).not.toThrow();

    const state = useMapStore.getState();
    expect(state.activeAircraft.reserveMinutes).toBe(DEFAULT_AIRCRAFT.reserveMinutes);
    expect(state.activeAircraft.registration).toBe(DEFAULT_AIRCRAFT.registration);
    expect(state.center).toEqual([28.0, -26.0]);
    expect(state.zoom).toBe(7);
    expect(state.routeName).toBe('Test active mission');
    expect(state.visibleLayers.airports).toBe(true);
    expect(state.visibleLayers.airspaces).toBe(false);
    expect(state.waypoints).toEqual([currentWaypoint]);
  });

  it('sanitizes corrupt persisted mission records before restoring the mission library', () => {
    expect(() => useMapStore.getState().restorePlannerSnapshotState({
      missionLibrary: [
        {
          id: 'legacy-mission',
          name: 'Legacy mission',
          status: 'ready',
          createdAt: '2026-07-01T12:00:00.000Z',
          updatedAt: '2026-07-01T12:30:00.000Z',
          state: {
            activeAircraft: null,
            waypoints: [
              {
                id: 'legacy-wp',
                type: 'airport',
                ident: 'FAOR',
                coordinates: [28.246, -26.139],
              },
              {
                name: 'Bad coordinates',
                coordinates: ['bad', -26.5],
              },
            ],
          },
        },
      ],
    })).not.toThrow();

    const mission = useMapStore.getState().missionLibrary[0];
    expect(mission.name).toBe('Legacy mission');
    expect(mission.state.activeAircraft.reserveMinutes).toBe(DEFAULT_AIRCRAFT.reserveMinutes);
    expect(mission.state.activeAircraft.registration).toBe(DEFAULT_AIRCRAFT.registration);
    expect(mission.state.waypoints).toHaveLength(1);
    expect(mission.state.waypoints[0]).toMatchObject({
      id: 'legacy-wp',
      ident: 'FAOR',
      name: 'FAOR',
      coordinates: [28.246, -26.139],
    });
  });

  it('migrates legacy persisted state away from crash-prone live browser fields', () => {
    const migrated = migratePersistedMapState({
      aircraftTrackingEnabled: true,
      activeRoute: {
        status: 'active',
        currentLegIndex: 99,
      },
      locationTracking: {
        enabled: true,
        followMode: true,
        status: 'tracking',
        position: {
          coordinates: [28.2, -26.1],
          timestamp: '2026-08-02T10:00:00.000Z',
        },
      },
      selectedFeature: {
        type: 'airspace',
        sourceId: 'legacy',
        name: 'Legacy selected feature',
      },
      routeEditingActive: true,
      routeName: 'Legacy route',
    }, 0);

    expect(HALO_MAP_STORE_VERSION).toBeGreaterThan(0);
    expect(migrated.routeName).toBe('Legacy route');
    expect(migrated.aircraftTrackingEnabled).toBe(false);
    expect(migrated.activeRoute).toBeUndefined();
    expect(migrated.locationTracking).toBeUndefined();
    expect(migrated.selectedFeature).toBeUndefined();
    expect(migrated.routeEditingActive).toBeUndefined();
  });
});
