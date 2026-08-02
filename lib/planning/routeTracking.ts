import type {
  ActiveRouteState,
  Coordinates,
  LocationTrackingState,
  TrackedLocation,
  Waypoint,
} from '@/types/planning';
import {
  calculateDistanceNm,
  calculateTrueBearingDeg,
  normalizeHeading,
  validateCoordinates,
} from '@/lib/planning/navigation';

const METERS_PER_NM = 1852;
const FEET_PER_METER = 3.280839895;
const KNOTS_PER_MPS = 1.943844492;
const DEFAULT_ARRIVAL_RADIUS_NM = 0.25;

export const DEFAULT_ACTIVE_ROUTE_STATE: ActiveRouteState = {
  status: 'idle',
  currentLegIndex: 0,
};

export const DEFAULT_LOCATION_TRACKING_STATE: LocationTrackingState = {
  enabled: false,
  followMode: false,
  status: 'idle',
};

export interface RawLocationInput {
  longitude: number;
  latitude: number;
  accuracyM?: number | null;
  altitudeM?: number | null;
  altitudeAccuracyM?: number | null;
  headingDeg?: number | null;
  speedMps?: number | null;
  timestamp?: number | string | Date;
}

export interface ActiveRouteProgress {
  currentLegIndex: number;
  nextWaypointId?: string;
  distanceToNextNm?: number;
  crossTrackErrorNm?: number;
}

export interface BrowserLocationErrorLike {
  code: number;
  message?: string;
  PERMISSION_DENIED?: number;
  POSITION_UNAVAILABLE?: number;
  TIMEOUT?: number;
}

export interface BrowserLocationFailure {
  status: LocationTrackingState['status'];
  message: string;
}

export function normalizeTrackedLocation(input: RawLocationInput): TrackedLocation {
  const coordinates: Coordinates = [input.longitude, input.latitude];
  validateCoordinates(coordinates);

  return {
    coordinates,
    accuracyM: finiteOptional(input.accuracyM),
    altitudeFt: convertMetersToFeet(input.altitudeM),
    altitudeAccuracyFt: convertMetersToFeet(input.altitudeAccuracyM),
    headingDeg: normalizeOptionalHeading(input.headingDeg),
    speedKts: convertMetersPerSecondToKnots(input.speedMps),
    timestamp: normalizeTimestamp(input.timestamp),
  };
}

export function calculateActiveRouteProgress(
  waypoints: Waypoint[],
  position: TrackedLocation,
  arrivalRadiusNm = DEFAULT_ARRIVAL_RADIUS_NM
): ActiveRouteProgress {
  if (waypoints.length < 2) {
    return { currentLegIndex: 0 };
  }

  let best: {
    legIndex: number;
    crossTrackErrorNm: number;
    fractionAlongLeg: number;
  } | null = null;

  for (let legIndex = 0; legIndex < waypoints.length - 1; legIndex += 1) {
    const projected = projectPointToRouteLeg(
      position.coordinates,
      waypoints[legIndex].coordinates,
      waypoints[legIndex + 1].coordinates
    );

    if (!best || projected.crossTrackErrorNm < best.crossTrackErrorNm) {
      best = {
        legIndex,
        crossTrackErrorNm: projected.crossTrackErrorNm,
        fractionAlongLeg: projected.fractionAlongLeg,
      };
    }
  }

  const currentLegIndex = best?.legIndex ?? 0;
  const nextWaypointIndex = Math.min(currentLegIndex + 1, waypoints.length - 1);
  const distanceToNextNm = calculateDistanceNm(position.coordinates, waypoints[nextWaypointIndex].coordinates);
  const shouldAdvance =
    distanceToNextNm <= arrivalRadiusNm &&
    currentLegIndex < waypoints.length - 2 &&
    (best?.fractionAlongLeg ?? 0) > 0.75;
  const resolvedLegIndex = shouldAdvance ? currentLegIndex + 1 : currentLegIndex;
  const resolvedNextWaypointIndex = Math.min(resolvedLegIndex + 1, waypoints.length - 1);

  return {
    currentLegIndex: resolvedLegIndex,
    nextWaypointId: waypoints[resolvedNextWaypointIndex]?.id,
    distanceToNextNm: calculateDistanceNm(position.coordinates, waypoints[resolvedNextWaypointIndex].coordinates),
    crossTrackErrorNm: best?.crossTrackErrorNm,
  };
}

export function resolveAircraftTrackHeading(
  position: TrackedLocation | undefined,
  waypoints: Waypoint[],
  currentLegIndex: number
): number {
  if (typeof position?.headingDeg === 'number') {
    return position.headingDeg;
  }

  if (waypoints.length >= 2) {
    const from = waypoints[Math.min(currentLegIndex, waypoints.length - 2)];
    const to = waypoints[Math.min(currentLegIndex + 1, waypoints.length - 1)];
    if (from && to) {
      return calculateTrueBearingDeg(from.coordinates, to.coordinates);
    }
  }

  return 0;
}

export function formatLocationTrackingLabel(state: LocationTrackingState): string {
  if (state.status === 'tracking') return 'GPS tracking';
  if (state.status === 'requesting') return state.error ? 'GPS acquiring' : 'Locating';
  if (state.status === 'denied') return 'GPS blocked';
  if (state.status === 'unavailable') return 'GPS unavailable';
  if (state.status === 'error') return 'GPS error';
  return 'GPS off';
}

export function classifyBrowserLocationFailure(error: BrowserLocationErrorLike): BrowserLocationFailure {
  const permissionDeniedCode = error.PERMISSION_DENIED ?? 1;
  const positionUnavailableCode = error.POSITION_UNAVAILABLE ?? 2;
  const timeoutCode = error.TIMEOUT ?? 3;

  if (error.code === permissionDeniedCode) {
    return {
      status: 'denied',
      message: 'Location permission was denied. Enable browser location access to show the aircraft on the map.',
    };
  }

  if (error.code === positionUnavailableCode) {
    return {
      status: 'requesting',
      message: 'Location permission is enabled; Halo is still waiting for a usable GPS fix.',
    };
  }

  if (error.code === timeoutCode) {
    return {
      status: 'requesting',
      message: 'Location permission is enabled; GPS acquisition is still in progress.',
    };
  }

  return {
    status: 'error',
    message: error.message || 'Location tracking failed.',
  };
}

function projectPointToRouteLeg(
  point: Coordinates,
  from: Coordinates,
  to: Coordinates
): { crossTrackErrorNm: number; fractionAlongLeg: number } {
  const referenceLatRad = ((from[1] + to[1]) / 2) * (Math.PI / 180);
  const cosLat = Math.max(0.1, Math.cos(referenceLatRad));
  const pointXY = toLocalXy(point, from, cosLat);
  const toXY = toLocalXy(to, from, cosLat);
  const legLengthSquared = toXY.x ** 2 + toXY.y ** 2;

  if (legLengthSquared === 0) {
    return {
      crossTrackErrorNm: calculateDistanceNm(point, from),
      fractionAlongLeg: 0,
    };
  }

  const unclampedFraction = ((pointXY.x * toXY.x) + (pointXY.y * toXY.y)) / legLengthSquared;
  const fractionAlongLeg = clamp(unclampedFraction, 0, 1);
  const closest: Coordinates = [
    from[0] + (to[0] - from[0]) * fractionAlongLeg,
    from[1] + (to[1] - from[1]) * fractionAlongLeg,
  ];

  return {
    crossTrackErrorNm: calculateDistanceNm(point, closest),
    fractionAlongLeg,
  };
}

function toLocalXy(point: Coordinates, origin: Coordinates, cosLat: number): { x: number; y: number } {
  return {
    x: (point[0] - origin[0]) * cosLat,
    y: point[1] - origin[1],
  };
}

function normalizeTimestamp(value: RawLocationInput['timestamp']): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

function normalizeOptionalHeading(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return normalizeHeading(value);
}

function convertMetersToFeet(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value * FEET_PER_METER;
}

function convertMetersPerSecondToKnots(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return value * KNOTS_PER_MPS;
}

function finiteOptional(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
