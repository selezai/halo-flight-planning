import { describe, expect, it } from 'vitest';
import {
  calculateActiveRouteProgress,
  classifyBrowserLocationFailure,
  formatLocationTrackingLabel,
  normalizeTrackedLocation,
  resolveAircraftTrackHeading,
} from '@/lib/planning/routeTracking';
import type { Waypoint } from '@/types/planning';

const waypoint = (id: string, coordinates: [number, number]): Waypoint => ({
  id,
  type: 'user',
  ident: id.toUpperCase(),
  name: id,
  coordinates,
});

describe('route tracking helpers', () => {
  it('normalizes browser position units into pilot-friendly tracked location data', () => {
    const location = normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      accuracyM: 12,
      altitudeM: 1524,
      altitudeAccuracyM: 18,
      headingDeg: 725,
      speedMps: 51.4444,
      timestamp: '2026-07-25T08:30:00.000Z',
    });

    expect(location.coordinates).toEqual([28.246, -26.134]);
    expect(location.accuracyM).toBe(12);
    expect(location.altitudeFt).toBeCloseTo(5000, 0);
    expect(location.altitudeAccuracyFt).toBeCloseTo(59, 0);
    expect(location.headingDeg).toBe(5);
    expect(location.speedKts).toBeCloseTo(100, 0);
    expect(location.timestamp).toBe('2026-07-25T08:30:00.000Z');
  });

  it('identifies current active leg and next waypoint from tracked position', () => {
    const route = [
      waypoint('faor', [28.246, -26.134]),
      waypoint('fala', [27.926, -25.939]),
      waypoint('fawb', [28.224, -25.654]),
    ];
    const location = normalizeTrackedLocation({
      longitude: 28.05,
      latitude: -26.01,
      timestamp: '2026-07-25T08:40:00.000Z',
    });

    const progress = calculateActiveRouteProgress(route, location);

    expect(progress.currentLegIndex).toBe(0);
    expect(progress.nextWaypointId).toBe('fala');
    expect(progress.distanceToNextNm).toBeGreaterThan(0);
    expect(progress.crossTrackErrorNm).toBeGreaterThanOrEqual(0);
  });

  it('advances to the next leg near the active waypoint', () => {
    const route = [
      waypoint('faor', [28.246, -26.134]),
      waypoint('fala', [27.926, -25.939]),
      waypoint('fawb', [28.224, -25.654]),
    ];
    const location = normalizeTrackedLocation({
      longitude: 27.926,
      latitude: -25.939,
      timestamp: '2026-07-25T08:50:00.000Z',
    });

    const progress = calculateActiveRouteProgress(route, location, 0.5);

    expect(progress.currentLegIndex).toBe(1);
    expect(progress.nextWaypointId).toBe('fawb');
  });

  it('uses real GPS heading before falling back to route leg bearing', () => {
    const route = [
      waypoint('faor', [28.246, -26.134]),
      waypoint('fala', [27.926, -25.939]),
    ];

    expect(resolveAircraftTrackHeading(
      normalizeTrackedLocation({
        longitude: 28.2,
        latitude: -26.1,
        headingDeg: 182,
      }),
      route,
      0
    )).toBe(182);

    expect(resolveAircraftTrackHeading(
      normalizeTrackedLocation({
        longitude: 28.2,
        latitude: -26.1,
      }),
      route,
      0
    )).toBeGreaterThan(0);
  });

  it('keeps recoverable browser GPS acquisition failures non-terminal', () => {
    expect(classifyBrowserLocationFailure({ code: 2 }).status).toBe('requesting');
    expect(classifyBrowserLocationFailure({ code: 3 }).status).toBe('requesting');
    expect(classifyBrowserLocationFailure({ code: 1 }).status).toBe('denied');
    expect(classifyBrowserLocationFailure({ code: 99, message: 'Unexpected GPS failure' })).toEqual({
      status: 'error',
      message: 'Unexpected GPS failure',
    });
  });

  it('shows acquiring copy while waiting after browser GPS timeout/unavailable callbacks', () => {
    expect(formatLocationTrackingLabel({
      enabled: true,
      followMode: true,
      status: 'requesting',
      error: 'Location permission is enabled; GPS acquisition is still in progress.',
    })).toBe('GPS acquiring');
  });
});
