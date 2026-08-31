import { describe, expect, it } from 'vitest';
import {
  createRouteCoordinateWaypoint,
  parseRouteInputItems,
} from '@/lib/planning/routeInput';

describe('route input parsing', () => {
  it('parses airport and navaid identifiers from whitespace and arrows', () => {
    const parsed = parseRouteInputItems('FAOR -> FALA LIV');

    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toEqual([
      { kind: 'query', source: 'FAOR', query: 'FAOR' },
      { kind: 'query', source: 'FALA', query: 'FALA' },
      { kind: 'query', source: 'LIV', query: 'LIV' },
    ]);
  });

  it('parses decimal coordinate pairs as latitude then longitude', () => {
    const parsed = parseRouteInputItems('-26.13370, 28.24600\n-25.93850, 27.92610');

    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toEqual([
      {
        kind: 'coordinate',
        source: '-26.13370, 28.24600',
        coordinates: [28.246, -26.1337],
      },
      {
        kind: 'coordinate',
        source: '-25.93850, 27.92610',
        coordinates: [27.9261, -25.9385],
      },
    ]);
  });

  it('parses hemisphere coordinate pairs', () => {
    const parsed = parseRouteInputItems('S26.13370 E028.24600; 25.93850S 027.92610E');

    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toEqual([
      {
        kind: 'coordinate',
        source: 'S26.13370 E028.24600',
        coordinates: [28.246, -26.1337],
      },
      {
        kind: 'coordinate',
        source: '25.93850S 027.92610E',
        coordinates: [27.9261, -25.9385],
      },
    ]);
  });

  it('rejects invalid coordinate and identifier text', () => {
    const parsed = parseRouteInputItems('FAOR\n191, -95\nnot@waypoint');

    expect(parsed.items).toEqual([
      { kind: 'query', source: 'FAOR', query: 'FAOR' },
    ]);
    expect(parsed.errors).toEqual([
      '"191, -95" is not a valid coordinate pair.',
      '"not@waypoint" is not a supported waypoint identifier or coordinate pair.',
    ]);
  });

  it('creates typed coordinate route waypoints without marking them as airports', () => {
    const waypoint = createRouteCoordinateWaypoint([28.246, -26.1337], 1, '-26.13370, 28.24600');

    expect(waypoint).toMatchObject({
      type: 'user',
      ident: 'PT01',
      name: 'Typed coordinate 1',
      coordinates: [28.246, -26.1337],
      notes: 'Typed route coordinate: -26.13370, 28.24600',
    });
  });
});
