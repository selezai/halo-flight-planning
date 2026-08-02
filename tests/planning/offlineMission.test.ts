import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import {
  buildOfflineMissionSnapshot,
  formatOfflineMissionSummary,
} from '@/lib/planning/offlineMission';
import { calculateRoute } from '@/lib/planning/navigation';
import { normalizeTrackedLocation } from '@/lib/planning/routeTracking';
import type { ActiveRouteState, LocationTrackingState, Waypoint } from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo International',
  coordinates: [28.246, -26.134],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  coordinates: [27.926, -25.939],
  notes: 'Call tower before joining',
};

const activeRoute: ActiveRouteState = {
  status: 'active',
  startedAt: '2026-07-25T08:00:00.000Z',
  currentLegIndex: 0,
  nextWaypointId: 'fala',
  distanceToNextNm: 21.5,
  crossTrackErrorNm: 0.2,
  lastPositionAt: '2026-07-25T08:10:00.000Z',
};

const locationTracking: LocationTrackingState = {
  enabled: true,
  followMode: true,
  status: 'tracking',
  position: normalizeTrackedLocation({
    longitude: 28.2,
    latitude: -26.1,
    altitudeM: 1524,
    speedMps: 51.4,
    timestamp: '2026-07-25T08:10:00.000Z',
  }),
  lastUpdatedAt: '2026-07-25T08:10:00.000Z',
};

describe('offline mission helpers', () => {
  it('builds an active mission snapshot with route, aircraft, waypoints, and last known position', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const snapshot = buildOfflineMissionSnapshot({
      routeName: 'Lanseria hop',
      departureTime: '2026-07-25T08:00',
      cruiseAltitudeFt: 6500,
      activeAircraft: DEFAULT_AIRCRAFT,
      waypoints: [faor, fala],
      route,
      activeRoute,
      locationTracking,
      now: new Date('2026-07-25T08:11:00.000Z'),
    });

    expect(snapshot).toMatchObject({
      version: 1,
      savedAt: '2026-07-25T08:11:00.000Z',
      routeName: 'Lanseria hop',
      departureTime: '2026-07-25T08:00',
      cruiseAltitudeFt: 6500,
      aircraft: {
        registration: DEFAULT_AIRCRAFT.registration,
        type: DEFAULT_AIRCRAFT.type,
      },
      route: {
        waypointCount: 2,
        legCount: 1,
        label: 'FAOR → FALA',
      },
      activeRoute: {
        status: 'active',
        nextWaypointId: 'fala',
      },
    });
    expect(snapshot.waypoints[1].notes).toBe('Call tower before joining');
    expect(snapshot.lastKnownPosition?.coordinates).toEqual([28.2, -26.1]);
  });

  it('formats a compact offline mission summary for the status chip', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const snapshot = buildOfflineMissionSnapshot({
      routeName: 'Lanseria hop',
      departureTime: '',
      cruiseAltitudeFt: 6500,
      activeAircraft: DEFAULT_AIRCRAFT,
      waypoints: [faor, fala],
      route,
      activeRoute,
      locationTracking,
      now: new Date('2026-07-25T08:11:00.000Z'),
    });

    expect(formatOfflineMissionSummary(snapshot)).toContain('FAOR → FALA');
    expect(formatOfflineMissionSummary(snapshot)).toContain('nm');
    expect(formatOfflineMissionSummary(snapshot)).toContain('gal required');
    expect(formatOfflineMissionSummary(snapshot)).toContain(DEFAULT_AIRCRAFT.registration);
  });
});
