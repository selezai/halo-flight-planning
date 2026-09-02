import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import {
  buildFuelPlanningResult,
  DEFAULT_FUEL_PLANNING_STATE,
  formatFuelQuantity,
  normalizeFuelQuantity,
  selectPerformanceOutput,
  toUsGallons,
} from '@/lib/planning/fuel';
import { calculateRoute } from '@/lib/planning/navigation';
import type {
  AircraftPerformanceProfile,
  FuelPlanningState,
  PerformancePhase,
  PerformanceTable,
  PerformanceTableOutput,
  WeightBalanceResult,
  Waypoint,
} from '@/types/planning';

const westPoint: Waypoint = {
  id: 'west',
  type: 'user',
  name: 'West point',
  coordinates: [28, -26],
};

const eastPoint: Waypoint = {
  id: 'east',
  type: 'user',
  name: 'East point',
  coordinates: [30, -26],
};

describe('advanced fuel planning', () => {
  it('builds a trusted SACAA/ATNS-style fuel breakdown from an approved profile', () => {
    const route = calculateRoute([westPoint, eastPoint], DEFAULT_AIRCRAFT);
    const result = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile: sampleApprovedProfile(),
      state: fuelPlanningState({
        flightRules: 'ifr',
        holdingMinutes: 10,
        finalReserveMinutes: 45,
        contingencyPercent: 10,
        alternate: { name: 'FALA', distanceNm: 20 },
        additionalFuel: { value: 1, unit: 'usg' },
      }),
      cruiseAltitudeFt: 6000,
      now: new Date('2026-08-31T12:00:00Z'),
    });

    expect(result.status).toBe('ready');
    expect(result.trusted).toBe(true);
    expect(result.tripFuel.value).toBeGreaterThan(0);
    expect(result.totalRequiredFuel.value).toBeGreaterThan(result.tripFuel.value);
    expect(result.breakdown.map((item) => item.kind)).toEqual([
      'taxi',
      'climb',
      'cruise',
      'descent',
      'trip',
      'contingency',
      'alternate',
      'holding',
      'final-reserve',
      'additional',
      'discretionary',
      'total-required',
      'expected-landing',
      'remaining',
    ]);
    expect(result.legs[0].groundSpeedKts).toBeCloseTo(115, 0);
  });

  it('uses route wind to change groundspeed and cruise fuel', () => {
    const route = calculateRoute([westPoint, eastPoint], DEFAULT_AIRCRAFT);
    const profile = sampleApprovedProfile();
    const headwind = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile,
      state: fuelPlanningState({
        wind: { source: 'manual', directionDeg: 90, speedKts: 20, label: 'Headwind' },
        contingencyPercent: 0,
        finalReserveMinutes: 45,
      }),
      cruiseAltitudeFt: 6000,
    });
    const tailwind = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile,
      state: fuelPlanningState({
        wind: { source: 'manual', directionDeg: 270, speedKts: 20, label: 'Tailwind' },
        contingencyPercent: 0,
        finalReserveMinutes: 45,
      }),
      cruiseAltitudeFt: 6000,
    });

    expect(headwind.legs[0].groundSpeedKts).toBeLessThan(tailwind.legs[0].groundSpeedKts);
    expect(headwind.tripFuel.value).toBeGreaterThan(tailwind.tripFuel.value);
  });

  it('evaluates required and target landing fuel policies', () => {
    const route = calculateRoute([westPoint, eastPoint], DEFAULT_AIRCRAFT);
    const required = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile: sampleApprovedProfile(),
      state: fuelPlanningState({ fuelPolicyMode: 'required' }),
      cruiseAltitudeFt: 6000,
    });
    const targetLanding = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile: sampleApprovedProfile(),
      state: fuelPlanningState({
        fuelPolicyMode: 'target-landing',
        targetLandingFuel: { value: 60, unit: 'usg' },
      }),
      cruiseAltitudeFt: 6000,
    });

    expect(required.policy).toMatchObject({
      mode: 'required',
      status: 'ready',
    });
    expect(targetLanding.policy).toMatchObject({
      mode: 'target-landing',
      status: 'caution',
    });
    expect(targetLanding.policy?.message).toContain('below target');
  });

  it('evaluates max fuel constrained by W&B policy without inventing aircraft-specific limits', () => {
    const route = calculateRoute([westPoint, eastPoint], DEFAULT_AIRCRAFT);
    const weightBalanceResult: WeightBalanceResult = {
      status: 'within-limits',
      message: 'W&B within limits.',
      issues: [],
    };
    const result = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile: sampleApprovedProfile(),
      state: fuelPlanningState({ fuelPolicyMode: 'max-wb-constrained' }),
      cruiseAltitudeFt: 6000,
      weightBalanceResult,
    });

    expect(result.policy).toMatchObject({
      mode: 'max-wb-constrained',
      status: 'ready',
      maxWbConstrainedFuel: result.usableFuel,
    });
  });

  it('does not extrapolate outside POH table bounds', () => {
    const profile = sampleApprovedProfile();
    const route = calculateRoute([westPoint, eastPoint], DEFAULT_AIRCRAFT);
    const result = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile,
      state: fuelPlanningState(),
      cruiseAltitudeFt: 9000,
    });

    expect(selectPerformanceOutput(profile.tables[1], { altitudeFt: 9000 }).message).toContain('cannot interpolate');
    expect(result.status).toBe('incomplete-profile');
    expect(result.trusted).toBe(false);
    expect(result.issues.join(' ')).toContain('cannot interpolate');
  });

  it('falls back to untrusted legacy fuel when the selected profile is not approved', () => {
    const route = calculateRoute([westPoint, eastPoint], DEFAULT_AIRCRAFT);
    const profile = { ...sampleApprovedProfile(), status: 'draft' as const, approvedAt: undefined };
    const result = buildFuelPlanningResult({
      route,
      aircraft: DEFAULT_AIRCRAFT,
      profile,
      state: fuelPlanningState(),
      cruiseAltitudeFt: 6000,
    });

    expect(result.status).toBe('untrusted-profile');
    expect(result.trusted).toBe(false);
    expect(result.breakdown[0].label).toBe('Legacy trip estimate');
  });

  it('converts and formats supported fuel units', () => {
    const litres = normalizeFuelQuantity({ value: 10, unit: 'usg' }, 'litre');

    expect(litres.value).toBeCloseTo(37.854, 3);
    expect(toUsGallons({ value: 60, unit: 'lb' }, 6)).toBeCloseTo(10, 5);
    expect(formatFuelQuantity({ value: 10, unit: 'usg' }, 'litre')).toBe('37.9 L');
  });
});

function fuelPlanningState(overrides: Partial<FuelPlanningState> = {}): FuelPlanningState {
  return {
    ...DEFAULT_FUEL_PLANNING_STATE,
    wind: { ...DEFAULT_FUEL_PLANNING_STATE.wind },
    additionalFuel: { ...DEFAULT_FUEL_PLANNING_STATE.additionalFuel },
    discretionaryFuel: { ...DEFAULT_FUEL_PLANNING_STATE.discretionaryFuel },
    ...overrides,
  };
}

function sampleApprovedProfile(): AircraftPerformanceProfile {
  return {
    id: 'profile-zs-hlo',
    ownerId: 'user_123',
    registration: 'ZS-HLO',
    aircraftType: 'C172S',
    displayName: 'ZS-HLO C172S',
    aircraftClass: 'piston',
    status: 'approved',
    source: {
      title: 'C172S POH Section 5',
      revision: 'Rev 8',
      page: '5-22',
    },
    fuelUnit: 'usg',
    displayFuelUnit: 'litre',
    fuelDensityLbPerUsg: 6,
    usableFuel: { value: 53, unit: 'usg' },
    defaultTaxiFuel: { value: 1, unit: 'usg' },
    contingencyPercent: 10,
    finalReserveMinutes: 45,
    defaultHoldingMinutes: 0,
    tables: [
      table('climb', 'Climb fuel', [
        [5000, { fuel: { value: 2, unit: 'usg' }, timeMinutes: 18, distanceNm: 24 }],
        [7000, { fuel: { value: 3, unit: 'usg' }, timeMinutes: 24, distanceNm: 31 }],
      ]),
      table('cruise', 'Cruise fuel flow', [
        [5000, { fuelFlowPerHour: { value: 10, unit: 'usg' }, trueAirspeedKts: 110 }],
        [7000, { fuelFlowPerHour: { value: 12, unit: 'usg' }, trueAirspeedKts: 120 }],
      ]),
      table('descent', 'Descent fuel', [
        [5000, { fuel: { value: 1, unit: 'usg' }, timeMinutes: 12, distanceNm: 18 }],
        [7000, { fuel: { value: 1.4, unit: 'usg' }, timeMinutes: 16, distanceNm: 24 }],
      ]),
      table('holding', 'Holding fuel flow', [
        [5000, { fuelFlowPerHour: { value: 8, unit: 'usg' } }],
        [7000, { fuelFlowPerHour: { value: 9, unit: 'usg' } }],
      ]),
    ],
    approvalNotes: 'Owner approved.',
    approvedAt: '2026-08-31T08:00:00.000Z',
    createdAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:00:00.000Z',
  };
}

function table(
  phase: PerformancePhase,
  title: string,
  rows: Array<[number, PerformanceTableOutput]>
): PerformanceTable {
  return {
    id: `${phase}-table`,
    phase,
    title,
    interpolationKeys: ['altitudeFt'],
    rows: rows.map(([altitudeFt, output]) => ({
      conditions: { altitudeFt },
      output,
    })),
  };
}
