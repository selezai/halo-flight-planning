import { describe, expect, it } from 'vitest';
import {
  buildHaloMissionSummary,
  normalizeHaloPanelId,
} from '@/lib/ui/halo';
import type {
  DataFreshness,
  RouteAirspaceReview,
  RouteAnalysis,
  RouteNotamReview,
  Waypoint,
  WeightBalanceResult,
} from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo International',
  coordinates: [28.246, -26.1337],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria International',
  coordinates: [27.9261, -25.9385],
};

const baseRoute: RouteAnalysis = {
  legs: [],
  summary: {
    waypointCount: 2,
    legCount: 1,
    totalDistanceNm: 21.8,
    estimatedTimeMinutes: 13,
    tripFuelGal: 2.3,
    reserveFuelGal: 5,
    contingencyFuelGal: 0.2,
    totalFuelRequiredGal: 7.5,
    usableFuelGal: 40,
    fuelRemainingGal: 32.5,
    fuelStatus: 'ok',
  },
};

const completeAirspace: RouteAirspaceReview = {
  source: 'openaip-core',
  status: 'complete',
  message: 'Complete',
  alerts: [],
  sampledPointCount: 20,
  visibleLayerCount: 6,
  updatedAt: '2026-07-21T08:00:00.000Z',
};

const southAfricaNotam: RouteNotamReview = {
  source: 'south-africa-official',
  status: 'manual-required',
  message: 'Manual official briefing required.',
  notams: [],
  locations: ['FAOR', 'FALA'],
  queryCount: 0,
  sourceUrl: 'https://file2fly.atns.co.za/aes/login.jsp',
  updatedAt: '2026-07-21T08:00:00.000Z',
};

const withinLimitsWb: WeightBalanceResult = {
  status: 'within-limits',
  message: 'Ramp, takeoff, and landing CG are within limits.',
  issues: [],
  calculatedAt: '2026-07-21T08:00:00.000Z',
};

const currentFreshness: DataFreshness[] = [
  { source: 'Route', status: 'current', label: 'Route current' },
  { source: 'Airspace', status: 'current', label: 'Airspace current' },
  { source: 'NOTAM', status: 'current', label: 'NOTAM current' },
  { source: 'W&B', status: 'current', label: 'W&B current' },
];

describe('Halo UI state helpers', () => {
  it('migrates removed or legacy panel ids to supported production panels', () => {
    expect(normalizeHaloPanelId('research')).toBe('briefing');
    expect(normalizeHaloPanelId('feature')).toBe('route');
    expect(normalizeHaloPanelId('admin')).toBe('admin');
    expect(normalizeHaloPanelId('unknown')).toBe('route');
    expect(normalizeHaloPanelId(undefined)).toBe('route');
  });

  it('returns an idle mission summary before the route has two waypoints', () => {
    const summary = buildHaloMissionSummary({
      route: {
        ...baseRoute,
        summary: {
          ...baseRoute.summary,
          waypointCount: 1,
          legCount: 0,
          totalDistanceNm: 0,
          estimatedTimeMinutes: 0,
        },
      },
      waypoints: [faor],
    });

    expect(summary.status).toBe('idle');
    expect(summary.primaryAction).toBe('Start route');
  });

  it('keeps South Africa manual NOTAM handoff from becoming a hard mission stop', () => {
    const summary = buildHaloMissionSummary({
      route: baseRoute,
      waypoints: [faor, fala],
      routeName: 'Gauteng hop',
      airspaceReview: completeAirspace,
      notamReview: southAfricaNotam,
      weightBalanceResult: withinLimitsWb,
      dataFreshness: currentFreshness,
    });

    expect(summary.status).toBe('ready');
    expect(summary.notamLabel).toContain('Official SA NOTAM handoff prepared');
  });

  it('prioritizes stop items above stale or review states', () => {
    const summary = buildHaloMissionSummary({
      route: {
        ...baseRoute,
        summary: {
          ...baseRoute.summary,
          fuelStatus: 'critical',
          fuelRemainingGal: -3,
        },
      },
      waypoints: [faor, fala],
      airspaceReview: completeAirspace,
      notamReview: southAfricaNotam,
      weightBalanceResult: {
        ...withinLimitsWb,
        status: 'incomplete',
        message: 'W&B setup incomplete.',
      },
      dataFreshness: [
        ...currentFreshness,
        { source: 'Weather', status: 'stale', label: 'Weather stale' },
      ],
    });

    expect(summary.status).toBe('stop');
    expect(summary.primaryAction).toBe('Fix fuel plan');
  });

  it('promotes unknown or stale freshness to mission review', () => {
    const summary = buildHaloMissionSummary({
      route: baseRoute,
      waypoints: [faor, fala],
      airspaceReview: completeAirspace,
      notamReview: southAfricaNotam,
      weightBalanceResult: withinLimitsWb,
      dataFreshness: [
        { source: 'Route', status: 'current', label: 'Route current' },
        { source: 'Weather', status: 'unknown', label: 'Weather unknown' },
      ],
    });

    expect(summary.status).toBe('review');
    expect(summary.detail).toContain('1 data source must be reviewed');
  });
});
