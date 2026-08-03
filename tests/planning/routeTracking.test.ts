import { describe, expect, it } from 'vitest';
import {
  calculateActiveRouteProgress,
  classifyBrowserLocationFailure,
  formatLocationTrackingLabel,
  formatLocationWatchStartFailure,
  INITIAL_LOCATION_FIX_OPTIONS,
  LOCATION_WATCH_OPTIONS,
  normalizeTrackedLocation,
  resolveAircraftTrackHeading,
  shouldKeepExistingTrackedLocation,
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

  it('sanitizes mobile GPS accuracy values before they reach the map overlay', () => {
    expect(normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      accuracyM: 0,
    }).accuracyM).toBeUndefined();

    expect(normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      accuracyM: -10,
    }).accuracyM).toBeUndefined();

    expect(normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      accuracyM: Number.NaN,
    }).accuracyM).toBeUndefined();

    expect(normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      accuracyM: 999_999_999,
    }).accuracyM).toBe(185_200);
  });

  it('uses a normal first fix before starting high accuracy refinement', () => {
    expect(INITIAL_LOCATION_FIX_OPTIONS).toEqual({
      enableHighAccuracy: false,
      maximumAge: 300_000,
      timeout: 15_000,
    });
    expect(LOCATION_WATCH_OPTIONS).toEqual({
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 20_000,
    });
  });

  it('rejects older cached GPS fixes after a newer aircraft position is already active', () => {
    const current = normalizeTrackedLocation({
      longitude: 28.246,
      latitude: -26.134,
      timestamp: '2026-08-02T10:01:00.000Z',
    });
    const olderCachedFix = normalizeTrackedLocation({
      longitude: 28.1,
      latitude: -26.2,
      timestamp: '2026-08-02T10:00:00.000Z',
    });
    const newerFix = normalizeTrackedLocation({
      longitude: 28.2,
      latitude: -26.1,
      timestamp: '2026-08-02T10:02:00.000Z',
    });

    expect(shouldKeepExistingTrackedLocation(olderCachedFix, current)).toBe(true);
    expect(shouldKeepExistingTrackedLocation(newerFix, current)).toBe(false);
    expect(shouldKeepExistingTrackedLocation(newerFix, undefined)).toBe(false);
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

  it('makes initial browser GPS acquisition failures visible and terminal', () => {
    expect(classifyBrowserLocationFailure({ code: 2 }).status).toBe('unavailable');
    expect(classifyBrowserLocationFailure({ code: 2 }).message).toContain('could not determine a position');
    expect(classifyBrowserLocationFailure({ code: 3 }).status).toBe('unavailable');
    expect(classifyBrowserLocationFailure({ code: 3 }).message).toContain('timed out');
    expect(classifyBrowserLocationFailure({ code: 1 }).status).toBe('denied');
    expect(classifyBrowserLocationFailure({ code: 1 }).message).toContain('system Location Services');
    expect(classifyBrowserLocationFailure({ code: 99, message: 'Unexpected GPS failure' })).toEqual({
      status: 'error',
      message: 'Unexpected GPS failure',
    });
  });

  it('keeps refinement watch timeout/unavailable callbacks non-terminal after a usable fix', () => {
    expect(classifyBrowserLocationFailure(
      { code: 2, message: 'temporary source failure' },
      { phase: 'watch', hasUsableFix: true }
    )).toEqual({
      status: 'requesting',
      message: 'GPS refinement is temporarily unavailable; Halo is keeping the last aircraft position. Browser message: temporary source failure',
    });

    expect(classifyBrowserLocationFailure(
      { code: 3 },
      { phase: 'watch', hasUsableFix: true }
    ).status).toBe('requesting');
  });

  it('shows acquiring copy while waiting after refinement watch callbacks', () => {
    expect(formatLocationTrackingLabel({
      enabled: true,
      followMode: true,
      status: 'requesting',
      error: 'Location permission is enabled; GPS acquisition is still in progress.',
    })).toBe('GPS acquiring');
  });

  it('formats synchronous browser watch startup failures without throwing', () => {
    expect(formatLocationWatchStartFailure(new Error('Permissions policy blocked geolocation'))).toEqual({
      status: 'unavailable',
      message: 'Location tracking could not start: Permissions policy blocked geolocation. Check browser site permissions and system Location Services.',
    });
  });
});
