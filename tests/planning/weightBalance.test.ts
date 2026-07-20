import { describe, expect, it } from 'vitest';
import type { AircraftProfile, WeightBalanceConfig, WeightBalanceLoading } from '@/types/planning';
import {
  calculateWeightBalance,
  createDefaultWeightBalanceConfig,
  interpolateEnvelopeLimits,
} from '@/lib/planning/weightBalance';

const config: WeightBalanceConfig = {
  units: 'imperial',
  setupStatus: 'configured',
  emptyWeightLb: 1660,
  emptyArmIn: 39.2,
  maxRampWeightLb: 2558,
  maxTakeoffWeightLb: 2550,
  maxLandingWeightLb: 2550,
  fuel: {
    armIn: 48,
    weightPerGalLb: 6,
    taxiFuelGal: 1,
  },
  stations: [
    { id: 'front-seats', name: 'Front seats', armIn: 37, maxWeightLb: 500 },
    { id: 'rear-seats', name: 'Rear seats', armIn: 73, maxWeightLb: 500 },
    { id: 'baggage', name: 'Baggage', armIn: 95, maxWeightLb: 120 },
  ],
  envelope: [
    { weightLb: 1500, forwardArmIn: 35, aftArmIn: 47.3 },
    { weightLb: 1950, forwardArmIn: 35, aftArmIn: 47.3 },
    { weightLb: 2550, forwardArmIn: 41, aftArmIn: 47.3 },
  ],
};

const aircraft: AircraftProfile = {
  id: 'test-c172',
  registration: 'ZS-TST',
  type: 'C172S',
  name: 'Test Skyhawk',
  cruiseSpeedKts: 120,
  fuelBurnGph: 9,
  usableFuelGal: 53,
  reserveMinutes: 45,
  contingencyPercent: 10,
  magneticVariationDeg: -24,
  weightBalance: config,
};

const loading: WeightBalanceLoading = {
  fuelGal: 40,
  stationWeights: {
    'front-seats': 340,
    'rear-seats': 120,
    baggage: 20,
  },
};

describe('weight and balance', () => {
  it('interpolates CG envelope limits by weight', () => {
    expect(interpolateEnvelopeLimits(config.envelope, 2250)).toEqual({
      forwardArmIn: 38,
      aftArmIn: 47.3,
    });
  });

  it('returns unconfigured until POH/AFM envelope data is entered', () => {
    const result = calculateWeightBalance({
      aircraft: {
        ...aircraft,
        weightBalance: createDefaultWeightBalanceConfig(),
      },
      loading,
    });

    expect(result.status).toBe('unconfigured');
    expect(result.message).toContain('POH/AFM');
  });

  it('calculates ramp, takeoff, and landing CG within limits', () => {
    const result = calculateWeightBalance({
      aircraft,
      loading,
      tripFuelGal: 15,
    });

    expect(result.status).toBe('within-limits');
    expect(result.ramp?.weightLb).toBeCloseTo(2380, 0);
    expect(result.takeoff?.weightLb).toBeCloseTo(2374, 0);
    expect(result.landing?.weightLb).toBeCloseTo(2284, 0);
    expect(result.takeoff?.withinEnvelope).toBe(true);
    expect(result.landing?.withinWeight).toBe(true);
  });

  it('flags overweight or out-of-envelope loading', () => {
    const result = calculateWeightBalance({
      aircraft,
      loading: {
        fuelGal: 53,
        stationWeights: {
          'front-seats': 480,
          'rear-seats': 450,
          baggage: 120,
        },
      },
    });

    expect(result.status).toBe('out-of-limits');
    expect(result.issues.some((issue) => issue.includes('exceeds maximum'))).toBe(true);
  });

  it('returns incomplete for invalid setup or loading values', () => {
    const result = calculateWeightBalance({
      aircraft: {
        ...aircraft,
        weightBalance: {
          ...config,
          fuel: { ...config.fuel, armIn: undefined },
        },
      },
      loading,
    });

    expect(result.status).toBe('incomplete');
    expect(result.issues).toContain('Fuel arm is required.');
  });

  it('flags planned trip fuel that exceeds loaded takeoff fuel', () => {
    const result = calculateWeightBalance({
      aircraft,
      loading: {
        fuelGal: 10,
        stationWeights: loading.stationWeights,
      },
      tripFuelGal: 15,
    });

    expect(result.status).toBe('out-of-limits');
    expect(result.issues.some((issue) => issue.includes('exceeds loaded takeoff fuel'))).toBe(true);
    expect(result.landing?.weightLb).toBeLessThan(result.takeoff?.weightLb ?? 0);
  });
});
