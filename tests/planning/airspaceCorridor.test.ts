import { describe, expect, it } from 'vitest';
import {
  buildPaddedBBox,
  formatBBox,
  routeMatchesAirspaceGeometry,
  splitRouteIntoQuerySegments,
} from '@/lib/planning/airspaceCorridor';
import type { Coordinates } from '@/types/planning';

describe('airspace corridor geometry', () => {
  it('builds OpenAIP bbox strings in minLng,minLat,maxLng,maxLat order', () => {
    const bbox = buildPaddedBBox([
      [28, -26],
      [28.5, -25.5],
    ], 6);

    expect(bbox.minLng).toBeLessThan(28);
    expect(bbox.minLat).toBeLessThan(-26);
    expect(bbox.maxLng).toBeGreaterThan(28.5);
    expect(bbox.maxLat).toBeGreaterThan(-25.5);
    expect(formatBBox(bbox)).toMatch(/^-?\d+\.\d{6},-?\d+\.\d{6},-?\d+\.\d{6},-?\d+\.\d{6}$/);
  });

  it('splits long route legs into bounded OpenAIP query segments', () => {
    const segments = splitRouteIntoQuerySegments([
      waypoint([18.6, -33.9]),
      waypoint([28.2, -26.1]),
    ], {
      corridorNm: 5,
      maxSegmentNm: 120,
    });

    expect(segments.length).toBeGreaterThan(4);
    expect(Math.max(...segments.map((segment) => segment.distanceNm))).toBeLessThanOrEqual(121);
  });

  it('matches a route crossing an airspace polygon', () => {
    const result = routeMatchesAirspaceGeometry([
      [27.9, -26.2],
      [28.3, -26.2],
    ], square({
      west: 28,
      east: 28.2,
      south: -26.3,
      north: -26.1,
    }), 2);

    expect(result.matches).toBe(true);
    expect(result.relationship).toBe('crossing');
    expect(result.distanceNm).toBe(0);
  });

  it('matches when a route starts inside an airspace polygon', () => {
    const result = routeMatchesAirspaceGeometry([
      [28.1, -26.2],
      [28.5, -26.2],
    ], square({
      west: 28,
      east: 28.2,
      south: -26.3,
      north: -26.1,
    }), 2);

    expect(result.matches).toBe(true);
    expect(result.relationship).toBe('crossing');
  });

  it('matches nearby polygons inside the selected route corridor', () => {
    const result = routeMatchesAirspaceGeometry([
      [27.9, -26.2],
      [28.3, -26.2],
    ], square({
      west: 28,
      east: 28.2,
      south: -26.14,
      north: -26.1,
    }), 5);

    expect(result.matches).toBe(true);
    expect(result.relationship).toBe('corridor');
    expect(result.distanceNm).toBeGreaterThan(0);
    expect(result.distanceNm).toBeLessThan(5);
  });

  it('rejects polygons outside the selected route corridor', () => {
    const result = routeMatchesAirspaceGeometry([
      [27.9, -26.2],
      [28.3, -26.2],
    ], square({
      west: 28,
      east: 28.2,
      south: -26.02,
      north: -26,
    }), 5);

    expect(result.matches).toBe(false);
    expect(result.relationship).toBe('none');
    expect(result.distanceNm).toBeGreaterThan(5);
  });
});

function waypoint(coordinates: Coordinates) {
  return { coordinates };
}

function square(bounds: {
  west: number;
  east: number;
  south: number;
  north: number;
}) {
  return {
    type: 'Polygon' as const,
    coordinates: [[
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south],
    ]],
  };
}
