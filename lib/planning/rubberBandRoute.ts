import type { Coordinates, Waypoint } from '@/types/planning';
import { calculateDistanceNm } from './navigation';

export function getNearestRouteLegIndex(waypoints: Pick<Waypoint, 'coordinates'>[], coordinates: Coordinates): number {
  if (waypoints.length < 2) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const distance = distanceToSegmentNm(coordinates, waypoints[index].coordinates, waypoints[index + 1].coordinates);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function insertWaypointAtRouteIndex(
  waypoints: Waypoint[],
  waypoint: Waypoint,
  insertIndex: number
): Waypoint[] {
  const clampedIndex = Math.max(0, Math.min(waypoints.length, insertIndex));
  return [
    ...waypoints.slice(0, clampedIndex),
    waypoint,
    ...waypoints.slice(clampedIndex),
  ];
}

export function chooseSnapWaypoint(
  coordinates: Coordinates,
  candidates: Waypoint[],
  maxDistanceNm = 1
): Waypoint | null {
  let best: { waypoint: Waypoint; distanceNm: number } | null = null;

  for (const candidate of candidates) {
    const distanceNm = calculateDistanceNm(coordinates, candidate.coordinates);
    if (distanceNm > maxDistanceNm) continue;
    if (!best || distanceNm < best.distanceNm) {
      best = { waypoint: candidate, distanceNm };
    }
  }

  return best?.waypoint ?? null;
}

function distanceToSegmentNm(point: Coordinates, from: Coordinates, to: Coordinates): number {
  const meanLat = (point[1] + from[1] + to[1]) / 3;
  const projectedPoint = project(point, meanLat);
  const projectedFrom = project(from, meanLat);
  const projectedTo = project(to, meanLat);
  const dx = projectedTo[0] - projectedFrom[0];
  const dy = projectedTo[1] - projectedFrom[1];

  if (dx === 0 && dy === 0) {
    return Math.hypot(projectedPoint[0] - projectedFrom[0], projectedPoint[1] - projectedFrom[1]);
  }

  const progress = Math.max(
    0,
    Math.min(1, ((projectedPoint[0] - projectedFrom[0]) * dx + (projectedPoint[1] - projectedFrom[1]) * dy) / (dx * dx + dy * dy))
  );

  return Math.hypot(
    projectedPoint[0] - (projectedFrom[0] + dx * progress),
    projectedPoint[1] - (projectedFrom[1] + dy * progress)
  );
}

function project(coordinate: Coordinates, meanLat: number): [number, number] {
  const lngScale = Math.max(0.15, Math.cos((meanLat * Math.PI) / 180));
  return [coordinate[0] * 60 * lngScale, coordinate[1] * 60];
}
