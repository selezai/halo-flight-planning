import type { Coordinates, Waypoint } from '@/types/planning';
import { calculateDistanceNm } from '@/lib/planning/navigation';

export interface AirportLockCandidate {
  waypoint: Waypoint;
  distanceNm: number;
}

export function chooseNearestAirportLock(
  coordinates: Coordinates,
  candidates: Waypoint[],
  maxDistanceNm = 10
): AirportLockCandidate | null {
  const airportCandidates = candidates
    .filter((candidate) => candidate.type === 'airport')
    .map((waypoint) => ({
      waypoint,
      distanceNm: calculateDistanceNm(coordinates, waypoint.coordinates),
    }))
    .filter((candidate) => candidate.distanceNm <= maxDistanceNm)
    .sort((a, b) =>
      a.distanceNm - b.distanceNm ||
      (a.waypoint.ident ?? a.waypoint.name).localeCompare(b.waypoint.ident ?? b.waypoint.name)
    );

  return airportCandidates[0] ?? null;
}

export function applyAirportLockToWaypoint(
  waypoint: Waypoint,
  airport: Waypoint
): Waypoint {
  return {
    ...waypoint,
    type: 'airport',
    name: airport.name,
    ident: airport.ident,
    coordinates: airport.coordinates,
    sourceId: airport.sourceId,
    elevationFt: airport.elevationFt,
  };
}
