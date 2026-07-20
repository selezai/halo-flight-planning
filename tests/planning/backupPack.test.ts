import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { buildBackupPackText } from '@/lib/planning/backupPack';
import { buildBriefingDigest } from '@/lib/planning/briefing';
import { assessDataFreshness } from '@/lib/planning/freshness';
import { calculateRoute } from '@/lib/planning/navigation';
import { buildTrainingNavLog } from '@/lib/planning/trainingNavlog';
import type { BriefingRisk, RouteNotamReview, WeightBalanceResult, Waypoint } from '@/types/planning';

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
  message: 'Ramp, takeoff, and landing CG are inside the configured envelope.',
  issues: [],
  takeoff: {
    label: 'takeoff',
    weightLb: 2300,
    armIn: 40.2,
    momentLbIn: 92460,
    forwardLimitIn: 38,
    aftLimitIn: 47,
    maxWeightLb: 2550,
    withinEnvelope: true,
    withinWeight: true,
  },
};

describe('backup pack', () => {
  it('includes digest, W&B, NOTAM source, stale warnings, emergency fields, and training navlog', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const risks: BriefingRisk[] = [
      { id: 'notam-manual-required', level: 'caution', title: 'Official NOTAM briefing required', detail: 'Get official PIB.' },
    ];
    const dataFreshness = [
      assessDataFreshness({
        source: 'Weather',
        updatedAt: '2026-07-20T08:00:00Z',
        maxAgeMinutes: 60,
        now: new Date('2026-07-20T10:00:00Z'),
      }),
    ];
    const digest = buildBriefingDigest({
      routeName: 'Backup route',
      route,
      risks,
      weather: [],
      routeNotamReview: notamReview,
      weightBalanceResult,
      dataFreshness,
    });
    const trainingNavLog = buildTrainingNavLog(route, DEFAULT_AIRCRAFT, { directionDeg: 180, speedKts: 10 });

    const text = buildBackupPackText({
      routeName: 'Backup route',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      digest,
      weather: [],
      risks,
      routeNotamReview: notamReview,
      weightBalanceResult,
      dataFreshness,
      trainingNavLog,
      cruiseAltitudeFt: 6500,
    });

    expect(text).toContain('HALO BACKUP / PRINT PACK');
    expect(text).toContain('PILOT DIGEST');
    expect(text).toContain('WEIGHT & BALANCE');
    expect(text).toContain('WITHIN LIMITS');
    expect(text).toContain('Official source URL: https://file2fly.atns.co.za/aes/login.jsp');
    expect(text).toContain('STALE: Weather: stale');
    expect(text).toContain('EMERGENCY / FORCED-LANDING WORKSHEET');
    expect(text).toContain('TRAINING / CHECKRIDE NAVLOG');
    expect(text).toContain('WCA=asin(crosswind/TAS)');
  });
});
