import type {
  AircraftProfile,
  Coordinates,
  RouteAnalysis,
  RouteLeg,
  RouteSummary,
  Waypoint,
} from '@/types/planning';

const EARTH_RADIUS_NM = 3440.065;

export function validateCoordinates(coordinates: Coordinates): void {
  const [longitude, latitude] = coordinates;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude');
  }
}

export function calculateDistanceNm(from: Coordinates, to: Coordinates): number {
  validateCoordinates(from);
  validateCoordinates(to);

  if (from[0] === to[0] && from[1] === to[1]) return 0;

  const [fromLng, fromLat] = from.map(toRadians);
  const [toLng, toLat] = to.map(toRadians);
  const deltaLat = toLat - fromLat;
  const deltaLng = toLng - fromLng;

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function calculateTrueBearingDeg(from: Coordinates, to: Coordinates): number {
  validateCoordinates(from);
  validateCoordinates(to);

  const [fromLng, fromLat] = from.map(toRadians);
  const [toLng, toLat] = to.map(toRadians);
  const deltaLng = toLng - fromLng;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

  return normalizeHeading(toDegrees(Math.atan2(y, x)));
}

export function calculateRoute(
  waypoints: Waypoint[],
  aircraft: AircraftProfile
): RouteAnalysis {
  const legs: RouteLeg[] = [];

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index];
    const to = waypoints[index + 1];
    const distanceNm = calculateDistanceNm(from.coordinates, to.coordinates);
    const trueCourseDeg = calculateTrueBearingDeg(from.coordinates, to.coordinates);
    const magneticCourseDeg = normalizeHeading(trueCourseDeg - aircraft.magneticVariationDeg);
    const estimatedTimeMinutes = (distanceNm / aircraft.cruiseSpeedKts) * 60;
    const fuelRequiredGal = (estimatedTimeMinutes / 60) * aircraft.fuelBurnGph;

    legs.push({
      id: `${from.id}-${to.id}`,
      from,
      to,
      distanceNm,
      trueCourseDeg,
      magneticCourseDeg,
      estimatedTimeMinutes,
      fuelRequiredGal,
    });
  }

  return {
    legs,
    summary: calculateRouteSummary(waypoints, legs, aircraft),
  };
}

export function createUserWaypoint(coordinates: Coordinates, index: number): Waypoint {
  validateCoordinates(coordinates);

  return {
    id: `user-${Date.now()}-${index}`,
    type: 'user',
    name: `Map point ${index}`,
    ident: `WP${String(index).padStart(2, '0')}`,
    coordinates,
  };
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';

  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatDistance(distanceNm: number): string {
  return `${distanceNm.toFixed(distanceNm >= 100 ? 0 : 1)} nm`;
}

export function formatFuel(fuelGal: number): string {
  return `${fuelGal.toFixed(fuelGal >= 100 ? 0 : 1)} gal`;
}

export function formatCourse(courseDeg: number): string {
  return `${Math.round(normalizeHeading(courseDeg)).toString().padStart(3, '0')} deg`;
}

export function formatCoordinates(coordinates: Coordinates): string {
  const [longitude, latitude] = coordinates;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function calculateRouteSummary(
  waypoints: Waypoint[],
  legs: RouteLeg[],
  aircraft: AircraftProfile
): RouteSummary {
  const totalDistanceNm = legs.reduce((sum, leg) => sum + leg.distanceNm, 0);
  const estimatedTimeMinutes = legs.reduce((sum, leg) => sum + leg.estimatedTimeMinutes, 0);
  const tripFuelGal = legs.reduce((sum, leg) => sum + leg.fuelRequiredGal, 0);
  const reserveFuelGal = (aircraft.reserveMinutes / 60) * aircraft.fuelBurnGph;
  const contingencyFuelGal = tripFuelGal * (aircraft.contingencyPercent / 100);
  const totalFuelRequiredGal = tripFuelGal + reserveFuelGal + contingencyFuelGal;
  const fuelRemainingGal = aircraft.usableFuelGal - totalFuelRequiredGal;
  const fuelStatus =
    totalFuelRequiredGal > aircraft.usableFuelGal
      ? 'critical'
      : fuelRemainingGal < reserveFuelGal * 0.5
        ? 'caution'
        : 'ok';

  return {
    waypointCount: waypoints.length,
    legCount: legs.length,
    totalDistanceNm,
    estimatedTimeMinutes,
    tripFuelGal,
    reserveFuelGal,
    contingencyFuelGal,
    totalFuelRequiredGal,
    usableFuelGal: aircraft.usableFuelGal,
    fuelRemainingGal,
    fuelStatus,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
