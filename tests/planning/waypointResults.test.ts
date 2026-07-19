import { describe, expect, it } from 'vitest';
import { mergeWaypointResults } from '@/lib/planning/waypointResults';
import type { Waypoint } from '@/types/planning';

describe('waypoint result merging', () => {
  it('dedupes starter and OpenAIP results with the same type and ident', () => {
    const starter = waypoint({
      id: 'egll',
      type: 'airport',
      ident: 'EGLL',
      name: 'London Heathrow',
      sourceId: undefined,
    });
    const openAip = waypoint({
      id: 'openaip-airport-626152254b027aab592b65a4',
      type: 'airport',
      ident: 'EGLL',
      name: 'LONDON HEATHROW',
      sourceId: '626152254b027aab592b65a4',
    });

    expect(mergeWaypointResults([starter], [openAip])).toEqual([starter]);
  });

  it('keeps airport and navaid results that share an ident', () => {
    const airport = waypoint({ id: 'abc-airport', type: 'airport', ident: 'ABC', name: 'ABC Airport' });
    const navaid = waypoint({ id: 'abc-navaid', type: 'navaid', ident: 'ABC', name: 'ABC VOR' });

    expect(mergeWaypointResults([airport], [navaid])).toEqual([airport, navaid]);
  });
});

function waypoint(overrides: Partial<Waypoint>): Waypoint {
  return {
    id: overrides.id ?? 'id',
    type: overrides.type ?? 'airport',
    name: overrides.name ?? 'Waypoint',
    ident: overrides.ident,
    coordinates: [0, 0],
    sourceId: overrides.sourceId,
  };
}
