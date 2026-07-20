import type {
  AircraftProfile,
  Coordinates,
  EmergencyAerodromeCandidate,
  EmergencyLandingSite,
  EmergencyLandingSuitability,
  EmergencyPlanningReview,
  Waypoint,
} from '@/types/planning';
import { STARTER_WAYPOINTS } from './sampleData';
import { calculateDistanceNm } from './navigation';

const FEET_PER_NM = 6076.12;
const DEFAULT_GLIDE_RATIO = 9;
const MAX_CANDIDATES = 8;

export function calculateGlideRadiusNm(altitudeAglFt: number, glideRatio: number): number {
  if (!Number.isFinite(altitudeAglFt) || altitudeAglFt <= 0) return 0;
  if (!Number.isFinite(glideRatio) || glideRatio <= 0) return 0;
  return (altitudeAglFt * glideRatio) / FEET_PER_NM;
}

export function scoreEmergencyCandidate(params: {
  distanceFromRouteNm: number;
  suitability: EmergencyLandingSuitability;
}): number {
  const suitabilityBonus: Record<EmergencyLandingSuitability, number> = {
    good: 35,
    caution: 15,
    unknown: 0,
    unsuitable: -50,
  };

  return Math.round(100 + suitabilityBonus[params.suitability] - Math.max(0, params.distanceFromRouteNm) * 4);
}

export function buildEmergencyPlanningReview(params: {
  waypoints: Waypoint[];
  cruiseAltitudeFt: number;
  aircraft: AircraftProfile;
  userSites: EmergencyLandingSite[];
  now?: Date;
}): EmergencyPlanningReview {
  const glideRatio = params.aircraft.glideRatio ?? DEFAULT_GLIDE_RATIO;
  const glideRadiusNm = calculateGlideRadiusNm(params.cruiseAltitudeFt, glideRatio);

  if (params.waypoints.length < 2) {
    return {
      status: 'needs-route',
      message: 'Add at least two route waypoints to build emergency landing candidates and glide rings.',
      cruiseAltitudeFt: params.cruiseAltitudeFt,
      glideRatio,
      glideRadiusNm,
      candidates: [],
      userSites: params.userSites,
      updatedAt: (params.now ?? new Date()).toISOString(),
    };
  }

  const route = params.waypoints.map((waypoint) => waypoint.coordinates);
  const candidates = dedupeCandidates([
    ...params.waypoints
      .filter((waypoint) => waypoint.type === 'airport')
      .map((waypoint) => toCandidate(waypoint, route, 'route-waypoint', 'unknown')),
    ...STARTER_WAYPOINTS
      .filter((waypoint) => waypoint.type === 'airport')
      .map((waypoint) => toCandidate(waypoint, route, 'starter-data', 'unknown'))
      .filter((candidate) => candidate.distanceFromRouteNm <= Math.max(25, glideRadiusNm)),
    ...params.userSites.map((site) => ({
      id: site.id,
      name: site.name,
      coordinates: site.coordinates,
      source: 'user-site' as const,
      suitability: site.suitability,
      distanceFromRouteNm: distanceToRouteNm(site.coordinates, route),
      score: scoreEmergencyCandidate({
        distanceFromRouteNm: distanceToRouteNm(site.coordinates, route),
        suitability: site.suitability,
      }),
    })),
  ]).sort((a, b) => b.score - a.score || a.distanceFromRouteNm - b.distanceFromRouteNm)
    .slice(0, MAX_CANDIDATES);

  return {
    status: candidates.length > 0 ? 'available' : 'review',
    message: candidates.length > 0
      ? `${candidates.length} emergency landing candidate${candidates.length === 1 ? '' : 's'} available from route/starter/user data. Verify suitability before flight.`
      : 'No emergency landing candidates are available from current route data; add user-marked forced-landing sites.',
    cruiseAltitudeFt: params.cruiseAltitudeFt,
    glideRatio,
    glideRadiusNm,
    candidates,
    userSites: params.userSites,
    updatedAt: (params.now ?? new Date()).toISOString(),
  };
}

export function formatEmergencyPlanningLines(review?: EmergencyPlanningReview): string[] {
  if (!review) {
    return ['Emergency planning review unavailable. Mark alternates and forced-landing options before flight.'];
  }

  return [
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    `Glide: ${review.glideRatio}:1 from ${Math.round(review.cruiseAltitudeFt)} ft gives approximately ${review.glideRadiusNm.toFixed(1)} nm still-air radius.`,
    `User forced-landing sites: ${review.userSites.length}`,
    ...(review.candidates.length
      ? review.candidates.map((candidate, index) =>
        `${index + 1}. ${candidate.ident ? `${candidate.ident} ` : ''}${candidate.name} (${candidate.source}, ${candidate.suitability}) - ${candidate.distanceFromRouteNm.toFixed(1)} nm from route, score ${candidate.score}`
      )
      : ['No emergency candidates in Halo. Add user sites and verify official aerodrome data.']),
  ];
}

function toCandidate(
  waypoint: Waypoint,
  route: Coordinates[],
  source: EmergencyAerodromeCandidate['source'],
  suitability: EmergencyLandingSuitability
): EmergencyAerodromeCandidate {
  const distanceFromRouteNm = distanceToRouteNm(waypoint.coordinates, route);

  return {
    id: waypoint.sourceId ?? waypoint.id,
    name: waypoint.name,
    ident: waypoint.ident,
    coordinates: waypoint.coordinates,
    elevationFt: waypoint.elevationFt,
    source,
    suitability,
    distanceFromRouteNm,
    score: scoreEmergencyCandidate({
      distanceFromRouteNm,
      suitability,
    }),
  };
}

function dedupeCandidates(candidates: EmergencyAerodromeCandidate[]): EmergencyAerodromeCandidate[] {
  const seen = new Set<string>();
  const unique: EmergencyAerodromeCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.ident ?? `${candidate.coordinates[0].toFixed(4)},${candidate.coordinates[1].toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }

  return unique;
}

function distanceToRouteNm(point: Coordinates, route: Coordinates[]): number {
  if (route.length === 0) return Number.POSITIVE_INFINITY;
  if (route.length === 1) return calculateDistanceNm(point, route[0]);

  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < route.length - 1; index += 1) {
    minDistance = Math.min(minDistance, distanceToSegmentNm(point, route[index], route[index + 1]));
  }

  return minDistance;
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
