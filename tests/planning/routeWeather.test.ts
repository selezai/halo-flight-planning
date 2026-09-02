import { describe, expect, it } from 'vitest';
import { buildRouteWeatherReview } from '@/lib/planning/routeWeather';
import type { Waypoint, WeatherReport } from '@/types/planning';

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

const faorMetar: WeatherReport = {
  icao: 'FAOR',
  raw: 'FAOR 010800Z 02008KT CAVOK 18/06 Q1025',
  clouds: [],
  flightCategory: 'VFR',
};

describe('route weather review', () => {
  it('summarizes loaded METAR/TAF data and keeps manual route wind visible', () => {
    const review = buildRouteWeatherReview({
      waypoints: [faor],
      reports: { FAOR: faorMetar },
      tafs: { FAOR: 'FAOR 010800Z 0109/0118 CAVOK' },
      wind: { source: 'manual', directionDeg: 20, speedKts: 8, label: 'Manual route wind' },
      now: new Date('2026-09-01T08:10:00Z'),
    });

    expect(review.status).toBe('manual-wind');
    expect(review.metarCount).toBe(1);
    expect(review.tafCount).toBe(1);
    expect(review.windStatus).toBe('manual');
    expect(review.windsAloftStatus).toBe('provider-not-configured');
  });

  it('flags partial weather when route airports are missing METAR or TAF data', () => {
    const review = buildRouteWeatherReview({
      waypoints: [faor, fala],
      reports: { FAOR: faorMetar },
      tafs: {},
    });

    expect(review.status).toBe('partial');
    expect(review.stations.find((station) => station.icao === 'FALA')?.message).toContain('METAR and TAF not loaded');
  });
});
