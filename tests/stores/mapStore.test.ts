import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '@/stores/mapStore';
import { createUserWaypoint } from '@/lib/planning/navigation';
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

  it('clears selected inspect features before planner panels reopen', () => {
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
    expect(state.sidebarPanel).toBe('route');
  });
});
