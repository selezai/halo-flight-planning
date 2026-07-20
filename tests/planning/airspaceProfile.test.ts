import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { buildAirspaceVerticalProfile } from '@/lib/planning/airspaceProfile';
import { buildBriefingText } from '@/lib/planning/briefing';
import { calculateRoute } from '@/lib/planning/navigation';
import { routeMatchesAirspaceGeometry } from '@/lib/planning/airspaceCorridor';
import type { RouteAirspaceAlert, Waypoint } from '@/types/planning';

const start: Waypoint = {
  id: 'start',
  type: 'airport',
  ident: 'FAOR',
  name: 'Start',
  coordinates: [28, -26.2],
};

const end: Waypoint = {
  id: 'end',
  type: 'airport',
  ident: 'FALA',
  name: 'End',
  coordinates: [29, -26.2],
};

describe('airspace vertical profile', () => {
  it('maps alert distance ranges and altitude bands into profile items', () => {
    const route = calculateRoute([start, end], DEFAULT_AIRCRAFT);
    const profile = buildAirspaceVerticalProfile(route, [alert({
      name: 'CTR TEST',
      level: 'critical',
      lowerLimit: 'GND',
      upperLimit: '7500 ft',
      lowerLimitFt: 0,
      upperLimitFt: 7500,
      startDistanceNm: 12,
      endDistanceNm: 22,
      conflict: true,
      requiresReview: true,
    })], 6500);

    expect(profile.status).toBe('critical');
    expect(profile.routeDistanceNm).toBeGreaterThan(50);
    expect(profile.items[0]).toMatchObject({
      name: 'CTR TEST',
      lowerLimitFt: 0,
      upperLimitFt: 7500,
      startDistanceNm: 12,
      endDistanceNm: 22,
      conflict: true,
    });
  });

  it('clamps inverted or out-of-route distance ranges', () => {
    const route = calculateRoute([start, end], DEFAULT_AIRCRAFT);
    const profile = buildAirspaceVerticalProfile(route, [alert({
      startDistanceNm: 999,
      endDistanceNm: -10,
    })], 6500);

    expect(profile.items[0].startDistanceNm).toBe(0);
    expect(profile.items[0].endDistanceNm).toBeCloseTo(route.summary.totalDistanceNm, 1);
  });

  it('estimates distance range from matched Core airspace geometry', () => {
    const match = routeMatchesAirspaceGeometry([
      [28, -26.2],
      [29, -26.2],
    ], {
      type: 'Polygon',
      coordinates: [[
        [28.35, -26.3],
        [28.55, -26.3],
        [28.55, -26.1],
        [28.35, -26.1],
        [28.35, -26.3],
      ]],
    }, 2);

    expect(match.matches).toBe(true);
    expect(match.startDistanceNm).toBeGreaterThan(15);
    expect(match.endDistanceNm).toBeGreaterThan(match.startDistanceNm ?? 0);
  });

  it('includes profile output in exported briefing text', () => {
    const route = calculateRoute([start, end], DEFAULT_AIRCRAFT);
    const alerts = [alert({
      name: 'TMA TEST',
      level: 'caution',
      lowerLimit: '4500 ft',
      upperLimit: 'FL110',
      startDistanceNm: 5,
      endDistanceNm: 15,
      requiresReview: true,
    })];
    const profile = buildAirspaceVerticalProfile(route, alerts, 6500);
    const text = buildBriefingText({
      routeName: 'Profile route',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [start, end],
      weather: [],
      risks: [],
      routeAirspaceAlerts: alerts,
      airspaceVerticalProfile: profile,
    });

    expect(text).toContain('AIRSPACE VERTICAL PROFILE');
    expect(text).toContain('TMA TEST');
    expect(text).toContain('5.0 nm-15.0 nm along route');
  });
});

function alert(overrides: Partial<RouteAirspaceAlert> = {}): RouteAirspaceAlert {
  return {
    id: overrides.name ?? 'airspace',
    name: 'Airspace',
    cruiseAltitudeFt: 6500,
    conflict: false,
    requiresReview: false,
    level: 'info',
    reason: 'Test alert.',
    ...overrides,
  };
}
