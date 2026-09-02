import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import {
  buildBriefingDigest,
  buildBriefingText,
  buildDispatchBriefingPackage,
  formatDispatchBriefingPackageLines,
} from '@/lib/planning/briefing';
import { buildRouteAirfieldBrief } from '@/lib/planning/airfieldBrief';
import { buildFlightAdminReview } from '@/lib/planning/flightAdmin';
import { calculateRoute } from '@/lib/planning/navigation';
import { buildRouteIntelligenceReview } from '@/lib/planning/routeIntelligence';
import { buildRouteWeatherReview } from '@/lib/planning/routeWeather';
import type { BriefingRisk, RouteNotamReview, Waypoint, WeightBalanceResult } from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo',
  coordinates: [28.246, -26.1337],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  coordinates: [27.9261, -25.9385],
};

const notamReview: RouteNotamReview = {
  source: 'south-africa-official',
  status: 'manual-required',
  message: 'Official South Africa NOTAM briefing is required.',
  notams: [],
  locations: ['FAOR', 'FALA'],
  queryCount: 0,
  sourceUrl: 'https://file2fly.atns.co.za/aes/login.jsp',
};

const weightBalanceResult: WeightBalanceResult = {
  status: 'within-limits',
  message: 'W&B within limits.',
  issues: [],
};

describe('briefing digest', () => {
  it('prioritizes critical risk items into stop status', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const risks: BriefingRisk[] = [
      { id: 'notam-manual-required', level: 'caution', title: 'Official NOTAM briefing required', detail: 'Get PIB.' },
      { id: 'weight-balance-out-of-limits', level: 'critical', title: 'W&B out of limits', detail: 'Reduce aft loading.' },
    ];
    const digest = buildBriefingDigest({
      routeName: 'FAOR-FALA',
      route,
      risks,
      weather: [],
      routeNotamReview: notamReview,
      weightBalanceResult,
    });

    expect(digest.status).toBe('stop');
    expect(digest.items[0]).toMatchObject({
      level: 'critical',
      title: 'W&B out of limits',
      source: 'W&B',
    });
  });

  it('returns review status for official NOTAM and missing weather actions', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const flightAdminReview = buildFlightAdminReview({
      routeNotamReview: notamReview,
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
    });
    const digest = buildBriefingDigest({
      routeName: 'FAOR-FALA',
      route,
      risks: [],
      weather: [],
      routeNotamReview: notamReview,
      weightBalanceResult,
      flightAdminReview,
    });

    expect(digest.status).toBe('review');
    expect(digest.items.map((item) => item.id)).toContain('flight-admin-notam-not-recorded');
    expect(digest.items.map((item) => item.id)).toContain('weather-digest-missing');
  });

  it('includes the pilot digest in exported briefing text', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const flightAdminReview = buildFlightAdminReview({
      routeNotamReview: notamReview,
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
    });
    const text = buildBriefingText({
      routeName: 'FAOR-FALA',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      weather: [],
      risks: [],
      routeNotamReview: notamReview,
      weightBalanceResult,
      flightAdminReview,
    });

    expect(text).toContain('PILOT DIGEST');
    expect(text).toContain('FLIGHT ADMIN');
    expect(text).toContain('Official NOTAM briefing is not recorded in Halo');
  });

  it('builds a structured dispatch package with every commercial-parity section and handoff warning', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const routeIntelligenceReview = buildRouteIntelligenceReview({
      waypoints: [faor, fala],
      aircraft: DEFAULT_AIRCRAFT,
    });
    const routeWeatherReview = buildRouteWeatherReview({
      waypoints: [faor, fala],
      reports: {},
      tafs: {},
    });
    const routeAirfieldBrief = buildRouteAirfieldBrief({
      waypoints: [faor, fala],
    });
    const digest = buildBriefingDigest({
      routeName: 'FAOR-FALA',
      route,
      risks: [],
      weather: [],
      routeIntelligenceReview,
      routeWeatherReview,
      routeAirfieldBrief,
    });
    const dispatchPackage = buildDispatchBriefingPackage({
      routeName: 'FAOR-FALA',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      digest,
      weather: [],
      risks: [],
      routeIntelligenceReview,
      routeWeatherReview,
      routeAirfieldBrief,
      routeNotamReview: notamReview,
      weightBalanceResult,
      now: new Date('2026-09-01T08:00:00Z'),
    });

    expect(dispatchPackage.sections.map((section) => section.id)).toEqual([
      'route-advisor',
      'navlog',
      'fuel-policy',
      'weight-balance',
      'weather',
      'airspace-notam-admin',
      'route-frequencies',
      'emergency',
      'data-freshness',
    ]);
    expect(dispatchPackage.officialHandoff.required).toBe(true);
    expect(dispatchPackage.officialHandoff.message).toContain('official weather');
    expect(formatDispatchBriefingPackageLines(dispatchPackage).join('\n')).toContain('ROUTE FREQUENCIES & AIRFIELDS');
  });
});
