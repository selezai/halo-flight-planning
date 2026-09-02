import { describe, expect, it } from 'vitest';
import { buildRouteAirfieldBrief } from '@/lib/planning/airfieldBrief';
import type { ParsedFeature } from '@/types/openaip';
import type { Waypoint } from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo',
  sourceId: 'airport-faor',
  coordinates: [28.246, -26.1337],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  sourceId: 'airport-fala',
  coordinates: [27.9261, -25.9385],
};

const faorFeature: ParsedFeature = {
  type: 'airport',
  sourceId: 'airport-faor',
  name: 'O.R. Tambo',
  icao: 'FAOR',
  coordinates: [28.246, -26.1337],
  frequencies: [{ type: 'TWR', value: '118.10 MHz' }],
  runways: [{ designator: '03L/21R', length: 4418, width: 60, surface: 'Asphalt', unit: 'm' }],
};

describe('route airfield brief', () => {
  it('includes available OpenAIP-style frequencies and runway data with official-source warnings', () => {
    const brief = buildRouteAirfieldBrief({
      waypoints: [faor],
      features: [faorFeature],
      now: new Date('2026-09-01T08:00:00Z'),
    });

    expect(brief.status).toBe('available');
    expect(brief.airports[0].frequencies[0]).toMatchObject({
      type: 'TWR',
      value: '118.10 MHz',
      source: 'openaip',
    });
    expect(brief.airports[0].missing).toContain('official SACAA/ATNS/AIP confirmation');
  });

  it('surfaces missing frequency and airfield data as an official verification action', () => {
    const brief = buildRouteAirfieldBrief({
      waypoints: [faor, fala],
      features: [faorFeature],
    });

    expect(brief.status).toBe('partial');
    expect(brief.airports.find((airport) => airport.ident === 'FALA')?.message).toContain('No frequency/runway data');
    expect(brief.airports.find((airport) => airport.ident === 'FALA')?.missing).toContain('frequency data');
  });
});
