import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import {
  calculateDistanceNm,
  calculateRoute,
  calculateTrueBearingDeg,
} from '@/lib/planning/navigation';
import { categorizeFlightConditions, parseRawMetar } from '@/lib/planning/weather';
import type { Waypoint } from '@/types/planning';

const jfk: Waypoint = {
  id: 'kjfk',
  type: 'airport',
  ident: 'KJFK',
  name: 'John F. Kennedy International',
  coordinates: [-73.7781, 40.6413],
};

const lax: Waypoint = {
  id: 'klax',
  type: 'airport',
  ident: 'KLAX',
  name: 'Los Angeles International',
  coordinates: [-118.4081, 33.9425],
};

describe('navigation calculations', () => {
  it('calculates known great-circle distances in nautical miles', () => {
    expect(calculateDistanceNm(jfk.coordinates, lax.coordinates)).toBeCloseTo(2146, 0);
  });

  it('calculates cardinal true bearings', () => {
    expect(calculateTrueBearingDeg([0, 0], [0, 1])).toBeCloseTo(0, 1);
    expect(calculateTrueBearingDeg([0, 0], [1, 0])).toBeCloseTo(90, 1);
  });

  it('builds route fuel totals with reserve and contingency', () => {
    const route = calculateRoute([jfk, lax], DEFAULT_AIRCRAFT);
    expect(route.legs).toHaveLength(1);
    expect(route.summary.totalDistanceNm).toBeGreaterThan(2000);
    expect(route.summary.reserveFuelGal).toBeCloseTo(7.125, 3);
    expect(route.summary.totalFuelRequiredGal).toBeGreaterThan(route.summary.tripFuelGal);
  });
});

describe('weather categorization', () => {
  it('categorizes FAA/NWS flight categories from ceiling and visibility', () => {
    expect(categorizeFlightConditions(3500, 6)).toBe('VFR');
    expect(categorizeFlightConditions(2500, 6)).toBe('MVFR');
    expect(categorizeFlightConditions(900, 6)).toBe('IFR');
    expect(categorizeFlightConditions(400, 6)).toBe('LIFR');
    expect(categorizeFlightConditions(undefined, 2.5)).toBe('IFR');
  });

  it('decodes useful planning fields from a raw METAR', () => {
    const report = parseRawMetar('FAOR 191200Z 36008KT 9999 FEW040 22/12 Q1024');
    expect(report.icao).toBe('FAOR');
    expect(report.wind?.directionDeg).toBe(360);
    expect(report.wind?.speedKts).toBe(8);
    expect(report.visibilitySm).toBeCloseTo(6.2, 1);
    expect(report.temperatureC).toBe(22);
    expect(report.altimeterHpa).toBe(1024);
    expect(report.flightCategory).toBe('VFR');
  });
});
