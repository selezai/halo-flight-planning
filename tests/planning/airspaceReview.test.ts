import { describe, expect, it } from 'vitest';
import {
  buildRouteAirspaceAlert,
  isAltitudeWithinLimits,
  sortRouteAirspaceAlerts,
} from '@/lib/planning/airspaceReview';
import type { ParsedFeature } from '@/types/openaip';

describe('route airspace review', () => {
  it('detects cruise-altitude conflicts inside controlled airspace', () => {
    const alert = buildRouteAirspaceAlert(makeAirspace({
      name: 'JOHANNESBURG CTR',
      airspaceType: 'CTR',
      airspaceClass: 'Class D',
      lowerLimit: 'GND',
      upperLimit: '7500 ft MSL',
      lowerLimitFt: 0,
      upperLimitFt: 7500,
    }), 6500);

    expect(alert?.conflict).toBe(true);
    expect(alert?.requiresReview).toBe(true);
    expect(alert?.level).toBe('critical');
  });

  it('marks crossed airspace outside cruise altitude as information', () => {
    const alert = buildRouteAirspaceAlert(makeAirspace({
      name: 'JOHANNESBURG SOUTHWEST',
      airspaceType: 'FIR',
      airspaceClass: 'Class G',
      lowerLimit: 'FL110',
      upperLimit: 'FL195',
      lowerLimitFt: 11000,
      upperLimitFt: 19500,
    }), 6500);

    expect(alert?.conflict).toBe(false);
    expect(alert?.requiresReview).toBe(false);
    expect(alert?.level).toBe('info');
  });

  it('keeps unknown vertical limits as caution', () => {
    const alert = buildRouteAirspaceAlert(makeAirspace({
      name: 'Unparsed Area',
      airspaceType: 'TRA',
    }), 4500);

    expect(alert?.conflict).toBe(false);
    expect(alert?.requiresReview).toBe(true);
    expect(alert?.level).toBe('caution');
  });

  it('describes airspaces near the route corridor', () => {
    const alert = buildRouteAirspaceAlert(makeAirspace({
      name: 'Nearby Training Area',
      airspaceType: 'TRA',
      lowerLimitFt: 0,
      upperLimitFt: 7500,
    }), 9500, {
      relationship: 'corridor',
      distanceNm: 2.4,
    });

    expect(alert?.relationship).toBe('corridor');
    expect(alert?.distanceNm).toBe(2.4);
    expect(alert?.reason).toContain('2.4 nm from the planned route corridor');
  });

  it('sorts critical alerts before caution and information', () => {
    const alerts = sortRouteAirspaceAlerts([
      buildRouteAirspaceAlert(makeAirspace({ name: 'Clear FIR', lowerLimitFt: 11000, upperLimitFt: 19500 }), 6500)!,
      buildRouteAirspaceAlert(makeAirspace({ name: 'Unknown TRA', airspaceType: 'TRA' }), 6500)!,
      buildRouteAirspaceAlert(makeAirspace({
        name: 'Control Zone',
        airspaceType: 'CTR',
        airspaceClass: 'Class D',
        lowerLimitFt: 0,
        upperLimitFt: 7500,
      }), 6500)!,
    ]);

    expect(alerts.map((alert) => alert.level)).toEqual(['critical', 'caution', 'info']);
  });

  it('handles unbounded vertical comparisons', () => {
    expect(isAltitudeWithinLimits(6500, undefined, 7500)).toBe(true);
    expect(isAltitudeWithinLimits(8500, undefined, 7500)).toBe(false);
    expect(isAltitudeWithinLimits(8500, 7500, undefined)).toBe(true);
  });
});

function makeAirspace(overrides: Partial<ParsedFeature>): ParsedFeature {
  return {
    type: 'airspace',
    sourceId: 'airspace-id',
    sourceLayer: 'airspaces',
    ...overrides,
  };
}
