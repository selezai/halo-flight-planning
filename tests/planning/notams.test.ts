import { describe, expect, it } from 'vitest';
import {
  buildRouteNotamLocations,
  categorizeNotam,
  normalizeFaaNotamPayload,
  sortRouteNotams,
} from '@/lib/planning/notams';

describe('route NOTAM planning helpers', () => {
  it('builds unique route NOTAM locations from airport and navaid idents only', () => {
    expect(buildRouteNotamLocations([
      { type: 'airport', ident: 'FAOR' },
      { type: 'user', ident: 'WP01' },
      { type: 'airport', ident: 'faor' },
      { type: 'navaid', ident: 'LIV' },
      { type: 'reporting-point', ident: 'ABC' },
    ])).toEqual(['FAOR', 'LIV']);
  });

  it('normalizes flexible FAA NOTAM payload shapes', () => {
    const notams = normalizeFaaNotamPayload({
      items: [
        {
          notamNumber: '07/123',
          icaoLocation: 'KJFK',
          notamType: 'D',
          rawText: 'KJFK RWY 04L/22R CLSD',
          effectiveStart: '2026-07-19T12:00:00Z',
          effectiveEnd: '2026-07-19T18:00:00Z',
        },
      ],
    }, 'KJFK');

    expect(notams).toHaveLength(1);
    expect(notams[0]).toMatchObject({
      id: 'KJFK-07/123',
      location: 'KJFK',
      type: 'D',
      category: 'runway',
      severity: 'critical',
      text: 'KJFK RWY 04L/22R CLSD',
      appliesToRoute: true,
      source: 'FAA NOTAM API',
    });
  });

  it('categorizes and sorts higher-risk NOTAMs first', () => {
    const sorted = sortRouteNotams([
      {
        id: 'info',
        location: 'KJFK',
        category: 'other',
        severity: 'info',
        text: 'KJFK MISC INFO',
        source: 'FAA NOTAM API',
        sourceUrl: 'https://notams.aim.faa.gov/notamSearch/',
        appliesToRoute: true,
      },
      {
        id: 'critical',
        location: 'KJFK',
        category: 'runway',
        severity: 'critical',
        text: 'KJFK RWY 04L CLSD',
        source: 'FAA NOTAM API',
        sourceUrl: 'https://notams.aim.faa.gov/notamSearch/',
        appliesToRoute: true,
      },
    ]);

    expect(categorizeNotam('ILS RWY 27 U/S')).toEqual({
      category: 'runway',
      severity: 'critical',
    });
    expect(sorted.map((notam) => notam.id)).toEqual(['critical', 'info']);
  });
});
