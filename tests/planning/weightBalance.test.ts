import { describe, expect, it } from 'vitest';
import { clampAircraftProfile } from '@/lib/planning/aircraft';
import { calculateRoute } from '@/lib/planning/navigation';
import {
  calculateWeightBalance,
  createDefaultWeightBalanceConfig,
  interpolateEnvelopeLimits,
} from '@/lib/planning/weightBalance';
import type { AircraftProfile, Waypoint } from '@/types/planning';

const departure: Waypoint = {
  id: 'fagm',
  type: 'airport',
  ident: 'FAGM',
  name: 'Rand',
  coordinates: [28.1512, -26.2425],
};

const destination: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  coordinates: [27.9261, -25.9385],
};

function testAircraft(overrides: Partial<AircraftProfile> = {}): AircraftProfile {
  return {
    id: 'test-c172',
    registration: 'ZS-TEST',
    type: 'C172S',
    name: 'Configured C172S test aircraft',
    cruiseSpeedKts: 120,
    fuelBurnGph: 9,
    usableFuelGal: 53,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
    weightBalance: {
      emptyWeightLb: 1660,
      emptyArmIn: 39.5,
      maxRampWeightLb: 2558,
      maxTakeoffWeightLb: 2550,
      maxLandingWeightLb: 2550,
      fuelArmIn: 48,
      fuelWeightLbPerGal: 6,
      stations: [
        { id: 'front-seats', label: 'Front seats', armIn: 37, maxWeightLb: 400 },
        { id: 'rear-seats', label: 'Rear seats', armIn: 73, maxWeightLb: 400 },
        { id: 'baggage', label: 'Baggage', armIn: 95, maxWeightLb: 120 },
      ],
      envelope: [
        { weightLb: 1500, forwardArmIn: 35, aftArmIn: 47.3 },
        { weightLb: 1950, forwardArmIn: 35, aftArmIn: 47.3 },
        { weightLb: 2550, forwardArmIn: 41, aftArmIn: 47.3 },
      ],
    },
    weightBalanceLoading: {
      fuelGallons: 40,
      taxiFuelGallons: 1,
      stationWeightsLb: {
        'front-seats': 340,
        'rear-seats': 120,
        baggage: 40,
      },
    },
    ...overrides,
  };
}

describe('weight and balance', () => {
  it('reports unconfigured aircraft until POH/AFM data is entered', () => {
    const aircraft = testAircraft({ weightBalance: undefined, weightBalanceLoading: undefined });
    expect(calculateWeightBalance(aircraft)).toMatchObject({
      status: 'unconfigured',
      phases: [],
    });
  });

  it('reports incomplete setup when envelope and arms are empty', () => {
    const aircraft = testAircraft({
      weightBalance: createDefaultWeightBalanceConfig(),
      weightBalanceLoading: undefined,
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.status).toBe('incomplete');
    expect(result.messages).toContain('Empty weight is required.');
    expect(result.messages).toContain('Each CG envelope point needs weight, forward arm, and aft arm.');
  });

  it('interpolates forward and aft CG limits for a configured envelope', () => {
    expect(interpolateEnvelopeLimits([
      { weightLb: 2000, forwardArmIn: 40, aftArmIn: 47 },
      { weightLb: 2500, forwardArmIn: 42, aftArmIn: 47 },
    ], 2250)).toEqual({
      forwardLimitIn: 41,
      aftLimitIn: 47,
    });
  });

  it('calculates ramp, takeoff, and landing balance within limits', () => {
    const route = calculateRoute([departure, destination], testAircraft());
    const result = calculateWeightBalance(testAircraft(), route);
    const ramp = result.phases[0];
    const takeoff = result.phases[1];

    expect(result.status).toBe('within-limits');
    expect(result.phases).toHaveLength(3);
    expect(result.phases.map((phase) => phase.phase)).toEqual(['ramp', 'takeoff', 'landing']);
    expect(result.phases[0].weightLb).toBeGreaterThan(result.phases[1].weightLb);
    expect(result.phases[1].weightLb).toBeGreaterThan(result.phases[2].weightLb);
    expect(ramp.weightLb).toBeCloseTo(2400, 2);
    expect(ramp.momentLbIn).toBeCloseTo(102230, 2);
    expect(ramp.armIn).toBeCloseTo(42.596, 3);
    expect(ramp.forwardLimitIn).toBeCloseTo(39.5, 1);
    expect(ramp.aftLimitIn).toBeCloseTo(47.3, 1);
    expect(ramp.maxWeightLb).toBe(2558);
    expect(takeoff.weightLb).toBeCloseTo(2394, 2);
  });

  it('falls back to MTOW for ramp max weight when ramp limit is omitted', () => {
    const aircraft = testAircraft({
      weightBalance: {
        ...testAircraft().weightBalance!,
        maxRampWeightLb: undefined,
      },
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.phases[0].maxWeightLb).toBe(2550);
  });

  it('flags overweight loading separately from envelope failures', () => {
    const aircraft = testAircraft({
      weightBalanceLoading: {
        fuelGallons: 53,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 400,
          'rear-seats': 400,
          baggage: 120,
        },
      },
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.status).toBe('out-of-limits');
    expect(result.messages.some((message) => message.includes('weight exceeds maximum'))).toBe(true);
  });

  it('flags in-range aft CG loading outside the configured envelope', () => {
    const aircraft = testAircraft({
      weightBalanceLoading: {
        fuelGallons: 30,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 170,
          'rear-seats': 400,
          baggage: 120,
        },
      },
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.status).toBe('out-of-limits');
    expect(result.messages.some((message) => message.includes('CG is outside'))).toBe(true);
  });

  it('flags CG caution near the aft envelope limit', () => {
    const aircraft = testAircraft({
      weightBalanceLoading: {
        fuelGallons: 20,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 200,
          'rear-seats': 400,
          baggage: 80,
        },
      },
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.status).toBe('caution');
    expect(result.messages.some((message) => message.includes('within 0.5 in'))).toBe(true);
  });

  it('flags weight caution near maximum weight', () => {
    const aircraft = testAircraft({
      weightBalanceLoading: {
        fuelGallons: 30,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 200,
          'rear-seats': 400,
          baggage: 80,
        },
      },
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.status).toBe('caution');
    expect(result.messages.some((message) => message.includes('within 2% of maximum'))).toBe(true);
  });

  it('flags station overloads without clamping the entered station weight', () => {
    const aircraft = testAircraft({
      weightBalanceLoading: {
        fuelGallons: 40,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 340,
          'rear-seats': 120,
          baggage: 150,
        },
      },
    });
    const result = calculateWeightBalance(aircraft);

    expect(result.status).toBe('out-of-limits');
    expect(result.messages).toContain('Baggage exceeds station limit 120 lb.');
    expect(result.phases[0].weightLb).toBeCloseTo(2510, 2);
  });

  it('preserves station overloads through aircraft profile sanitization', () => {
    const aircraft = clampAircraftProfile(testAircraft({
      weightBalanceLoading: {
        fuelGallons: 40,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 340,
          'rear-seats': 120,
          baggage: 150,
        },
      },
    }));
    const result = calculateWeightBalance(aircraft);

    expect(aircraft.weightBalanceLoading?.stationWeightsLb.baggage).toBe(150);
    expect(result.status).toBe('out-of-limits');
    expect(result.messages).toContain('Baggage exceeds station limit 120 lb.');
  });

  it('flags landing fuel shortfall when route trip fuel exceeds loaded takeoff fuel', () => {
    const aircraft = testAircraft({
      weightBalanceLoading: {
        fuelGallons: 2,
        taxiFuelGallons: 1,
        stationWeightsLb: {
          'front-seats': 340,
          'rear-seats': 120,
          baggage: 40,
        },
      },
    });
    const route = calculateRoute([departure, destination], aircraft);
    const result = calculateWeightBalance(aircraft, route);

    expect(result.status).toBe('out-of-limits');
    expect(result.messages.some((message) => message.includes('fuel state is short'))).toBe(true);
  });
});
