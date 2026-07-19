import type { Coordinates, Waypoint } from '@/types/planning';
import { calculateDistanceNm } from './navigation';

const NM_PER_DEGREE_LAT = 60;
const MIN_LONGITUDE_SCALE = 0.15;

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface RouteQuerySegment {
  from: Coordinates;
  to: Coordinates;
  bbox: BBox;
  distanceNm: number;
}

export interface AirspaceGeometryMatch {
  matches: boolean;
  relationship: 'crossing' | 'corridor' | 'none';
  distanceNm?: number;
}

export interface GeoJsonPolygon {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export function buildRouteSignature(
  waypoints: Pick<Waypoint, 'coordinates'>[],
  cruiseAltitudeFt: number,
  corridorNm: number
): string {
  const route = waypoints
    .map((waypoint) => waypoint.coordinates.map((coord) => coord.toFixed(5)).join(','))
    .join('|');
  return `${route}@${Math.round(cruiseAltitudeFt)}ft/${corridorNm.toFixed(1)}nm`;
}

export function splitRouteIntoQuerySegments(
  waypoints: Pick<Waypoint, 'coordinates'>[],
  options: {
    corridorNm: number;
    maxSegmentNm?: number;
  }
): RouteQuerySegment[] {
  const maxSegmentNm = options.maxSegmentNm ?? 120;
  const segments: RouteQuerySegment[] = [];

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index].coordinates;
    const to = waypoints[index + 1].coordinates;
    const distanceNm = calculateDistanceNm(from, to);
    const chunkCount = Math.max(1, Math.ceil(distanceNm / maxSegmentNm));

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const startProgress = chunkIndex / chunkCount;
      const endProgress = (chunkIndex + 1) / chunkCount;
      const chunkFrom = interpolateCoordinate(from, to, startProgress);
      const chunkTo = interpolateCoordinate(from, to, endProgress);
      const chunkDistanceNm = calculateDistanceNm(chunkFrom, chunkTo);

      segments.push({
        from: chunkFrom,
        to: chunkTo,
        distanceNm: chunkDistanceNm,
        bbox: buildPaddedBBox([chunkFrom, chunkTo], options.corridorNm),
      });
    }
  }

  return segments;
}

export function buildPaddedBBox(coordinates: Coordinates[], corridorNm: number): BBox {
  const lngs = coordinates.map((coord) => coord[0]);
  const lats = coordinates.map((coord) => coord[1]);
  const meanLat = lats.reduce((sum, lat) => sum + lat, 0) / Math.max(1, lats.length);
  const latPadding = corridorNm / NM_PER_DEGREE_LAT;
  const lngScale = Math.max(MIN_LONGITUDE_SCALE, Math.cos(toRadians(meanLat)));
  const lngPadding = corridorNm / (NM_PER_DEGREE_LAT * lngScale);

  return {
    minLng: clampLongitude(Math.min(...lngs) - lngPadding),
    minLat: clampLatitude(Math.min(...lats) - latPadding),
    maxLng: clampLongitude(Math.max(...lngs) + lngPadding),
    maxLat: clampLatitude(Math.max(...lats) + latPadding),
  };
}

export function formatBBox(bbox: BBox): string {
  return [
    bbox.minLng,
    bbox.minLat,
    bbox.maxLng,
    bbox.maxLat,
  ]
    .map((value) => value.toFixed(6))
    .join(',');
}

export function routeMatchesAirspaceGeometry(
  route: Coordinates[],
  geometry: GeoJsonPolygon | undefined,
  corridorNm: number
): AirspaceGeometryMatch {
  if (route.length < 2 || !geometry) {
    return { matches: false, relationship: 'none' };
  }

  const polygons = flattenPolygons(geometry);
  if (polygons.length === 0) {
    return { matches: false, relationship: 'none' };
  }

  for (const polygon of polygons) {
    if (routeIntersectsPolygon(route, polygon)) {
      return { matches: true, relationship: 'crossing', distanceNm: 0 };
    }
  }

  const distanceNm = minRouteToPolygonsDistanceNm(route, polygons);
  if (distanceNm <= corridorNm) {
    return { matches: true, relationship: 'corridor', distanceNm };
  }

  return { matches: false, relationship: 'none', distanceNm };
}

function routeIntersectsPolygon(route: Coordinates[], polygon: Coordinates[][]): boolean {
  const outerRing = polygon[0];
  if (!outerRing || outerRing.length < 4) return false;

  for (const point of route) {
    if (pointInPolygon(point, polygon)) return true;
  }

  for (let routeIndex = 0; routeIndex < route.length - 1; routeIndex += 1) {
    const routeStart = route[routeIndex];
    const routeEnd = route[routeIndex + 1];

    for (const ring of polygon) {
      for (let ringIndex = 0; ringIndex < ring.length - 1; ringIndex += 1) {
        if (segmentsIntersect(routeStart, routeEnd, ring[ringIndex], ring[ringIndex + 1])) {
          return true;
        }
      }
    }
  }

  return false;
}

function pointInPolygon(point: Coordinates, polygon: Coordinates[][]): boolean {
  if (!pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInRing(point: Coordinates, ring: Coordinates[]): boolean {
  let inside = false;
  const [x, y] = point;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previousIndex];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function segmentsIntersect(a: Coordinates, b: Coordinates, c: Coordinates, d: Coordinates): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);

  if (abC === 0 && onSegment(a, c, b)) return true;
  if (abD === 0 && onSegment(a, d, b)) return true;
  if (cdA === 0 && onSegment(c, a, d)) return true;
  if (cdB === 0 && onSegment(c, b, d)) return true;

  return abC !== abD && cdA !== cdB;
}

function orientation(a: Coordinates, b: Coordinates, c: Coordinates): -1 | 0 | 1 {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-12) return 0;
  return value > 0 ? 1 : -1;
}

function onSegment(a: Coordinates, b: Coordinates, c: Coordinates): boolean {
  return (
    b[0] <= Math.max(a[0], c[0]) &&
    b[0] >= Math.min(a[0], c[0]) &&
    b[1] <= Math.max(a[1], c[1]) &&
    b[1] >= Math.min(a[1], c[1])
  );
}

function minRouteToPolygonsDistanceNm(route: Coordinates[], polygons: Coordinates[][][]): number {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let routeIndex = 0; routeIndex < route.length - 1; routeIndex += 1) {
    const routeStart = route[routeIndex];
    const routeEnd = route[routeIndex + 1];

    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (let ringIndex = 0; ringIndex < ring.length - 1; ringIndex += 1) {
          const distance = segmentDistanceNm(routeStart, routeEnd, ring[ringIndex], ring[ringIndex + 1]);
          minDistance = Math.min(minDistance, distance);
        }
      }
    }
  }

  return minDistance;
}

function segmentDistanceNm(a: Coordinates, b: Coordinates, c: Coordinates, d: Coordinates): number {
  if (segmentsIntersect(a, b, c, d)) return 0;

  const meanLat = (a[1] + b[1] + c[1] + d[1]) / 4;
  const projectedA = project(a, meanLat);
  const projectedB = project(b, meanLat);
  const projectedC = project(c, meanLat);
  const projectedD = project(d, meanLat);

  return Math.min(
    pointToSegmentDistance(projectedA, projectedC, projectedD),
    pointToSegmentDistance(projectedB, projectedC, projectedD),
    pointToSegmentDistance(projectedC, projectedA, projectedB),
    pointToSegmentDistance(projectedD, projectedA, projectedB)
  );
}

function pointToSegmentDistance(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): number {
  const dx = segmentEnd[0] - segmentStart[0];
  const dy = segmentEnd[1] - segmentStart[1];

  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - segmentStart[0], point[1] - segmentStart[1]);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - segmentStart[0]) * dx + (point[1] - segmentStart[1]) * dy) / (dx * dx + dy * dy)
    )
  );
  const projected: [number, number] = [segmentStart[0] + t * dx, segmentStart[1] + t * dy];

  return Math.hypot(point[0] - projected[0], point[1] - projected[1]);
}

function project(coordinate: Coordinates, meanLat: number): [number, number] {
  const lngScale = Math.max(MIN_LONGITUDE_SCALE, Math.cos(toRadians(meanLat)));
  return [coordinate[0] * NM_PER_DEGREE_LAT * lngScale, coordinate[1] * NM_PER_DEGREE_LAT];
}

function flattenPolygons(geometry: GeoJsonPolygon): Coordinates[][][] {
  if (geometry.type === 'Polygon') {
    return normalizePolygon(geometry.coordinates as number[][][]);
  }

  return (geometry.coordinates as number[][][][]).flatMap(normalizePolygon);
}

function normalizePolygon(rawPolygon: number[][][]): Coordinates[][][] {
  const polygon = rawPolygon
    .map((ring) =>
      ring
        .filter((coord): coord is Coordinates => (
          Array.isArray(coord) &&
          coord.length >= 2 &&
          Number.isFinite(coord[0]) &&
          Number.isFinite(coord[1])
        ))
        .map((coord) => [coord[0], coord[1]] as Coordinates)
    )
    .filter((ring) => ring.length >= 4);

  return polygon.length ? [polygon] : [];
}

function interpolateCoordinate(from: Coordinates, to: Coordinates, progress: number): Coordinates {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

function clampLatitude(latitude: number): number {
  return Math.max(-90, Math.min(90, latitude));
}

function clampLongitude(longitude: number): number {
  return Math.max(-180, Math.min(180, longitude));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
