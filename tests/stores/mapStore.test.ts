import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '@/stores/mapStore';
import { createUserWaypoint } from '@/lib/planning/navigation';

describe('map store route planning actions', () => {
  beforeEach(() => {
    useMapStore.setState({
      waypoints: [],
      sidebarOpen: false,
      sidebarPanel: 'briefing',
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
});
