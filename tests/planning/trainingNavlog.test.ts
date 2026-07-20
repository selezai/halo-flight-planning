import { describe, expect, it } from 'vitest';
import { buildBriefingText } from '@/lib/planning/briefing';
import { calculateRoute } from '@/lib/planning/navigation';
import { buildTrainingNavLog } from '@/lib/planning/trainingNavlog';
import type { AircraftProfile, Waypoint } from '@/types/planning';

const aircraft: AircraftProfile = {
  id: 'training-aircraft',
  registration: 'ZS-TRN',
  type: 'PA28',
  name: 'Training Warrior',
  cruiseSpeedKts: 120,
  fuelBurnGph: 9,
  usableFuelGal: 48,
  reserveMinutes: 45,
  contingencyPercent: 10,
  magneticVariationDeg: -20,
  compassDeviationDeg: 2,
};

const origin: Waypoint = {
  id: 'origin',
  type: 'airport',
  ident: 'FAOR',
  name: 'Origin',
  coordinates: [0, 0],
};

const east: Waypoint = {
  id: 'east',
  type: 'airport',
  ident: 'FALA',
  name: 'East',
  coordinates: [1, 0],
};

const north: Waypoint = {
  id: 'north',
  type: 'airport',
  ident: 'FAPN',
  name: 'North',
  coordinates: [0, 1],
};

describe('training navlog', () => {
  it('keeps calm-wind heading and groundspeed aligned with route course', () => {
    const route = calculateRoute([origin, east], aircraft);
    const navLog = buildTrainingNavLog(route, aircraft, { directionDeg: 0, speedKts: 0 });
    const leg = navLog.legs[0];

    expect(leg.trueCourseDeg).toBeCloseTo(90, 0);
    expect(leg.windCorrectionAngleDeg).toBeCloseTo(0, 1);
    expect(leg.trueHeadingDeg).toBeCloseTo(leg.trueCourseDeg, 1);
    expect(leg.groundSpeedKts).toBeCloseTo(aircraft.cruiseSpeedKts, 1);
    expect(leg.fuelRequiredGal).toBeCloseTo((leg.estimatedTimeMinutes / 60) * aircraft.fuelBurnGph, 5);
  });

  it('reduces groundspeed for headwind and increases it for tailwind', () => {
    const route = calculateRoute([origin, north], aircraft);
    const headwind = buildTrainingNavLog(route, aircraft, { directionDeg: 0, speedKts: 20 });
    const tailwind = buildTrainingNavLog(route, aircraft, { directionDeg: 180, speedKts: 20 });

    expect(headwind.legs[0].groundSpeedKts).toBeCloseTo(100, 0);
    expect(tailwind.legs[0].groundSpeedKts).toBeCloseTo(140, 0);
    expect(headwind.legs[0].estimatedTimeMinutes).toBeGreaterThan(tailwind.legs[0].estimatedTimeMinutes);
  });

  it('calculates crosswind correction and magnetic/compass headings', () => {
    const route = calculateRoute([origin, east], aircraft);
    const navLog = buildTrainingNavLog(route, aircraft, { directionDeg: 180, speedKts: 20 });
    const leg = navLog.legs[0];

    expect(leg.windCorrectionAngleDeg).toBeGreaterThan(9);
    expect(leg.trueHeadingDeg).toBeGreaterThan(leg.trueCourseDeg);
    expect(leg.magneticHeadingDeg).toBeCloseTo(leg.trueHeadingDeg + 20, 1);
    expect(leg.compassHeadingDeg).toBeCloseTo(leg.magneticHeadingDeg + 2, 1);
  });

  it('includes training formula and compass heading in exported briefing text', () => {
    const route = calculateRoute([origin, east], aircraft);
    const trainingNavLog = buildTrainingNavLog(route, aircraft, { directionDeg: 180, speedKts: 20 });
    const text = buildBriefingText({
      routeName: 'Training route',
      aircraft,
      route,
      waypoints: [origin, east],
      weather: [],
      risks: [],
      trainingNavLog,
    });

    expect(text).toContain('TRAINING / CHECKRIDE NAVLOG');
    expect(text).toContain('WCA=asin(crosswind/TAS)');
    expect(text).toContain('CH ');
  });
});
