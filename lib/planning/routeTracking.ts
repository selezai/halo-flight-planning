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
const MAX_RENDERABLE_ACCURACY_M = METERS_PER_NM * 100;
const MIN_MOVEMENT_HEADING_DISTANCE_M = 15;
const MAX_MOVEMENT_HEADING_ACCURACY_GATE_M = 100;
const MAX_MOVEMENT_HEADING_FIX_GAP_MS = 120_000;

export const INITIAL_LOCATION_FIX_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 300_000,
  timeout: 15_000,
} satisfies PositionOptions;

export const LOCATION_WATCH_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 30_000,
  timeout: 20_000,
} satisfies PositionOptions;

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

export interface BrowserLocationFailureOptions {
  phase?: 'initial-fix' | 'watch';
  hasUsableFix?: boolean;
}

export function normalizeTrackedLocation(input: RawLocationInput): TrackedLocation {
  const coordinates: Coordinates = [input.longitude, input.latitude];
  validateCoordinates(coordinates);

  return {
    coordinates,
    accuracyM: normalizeAccuracyMeters(input.accuracyM),
    altitudeFt: convertMetersToFeet(input.altitudeM),
    altitudeAccuracyFt: convertMetersToFeet(input.altitudeAccuracyM),
    headingDeg: normalizeOptionalHeading(input.headingDeg),
    speedKts: convertMetersPerSecondToKnots(input.speedMps),
    timestamp: normalizeTimestamp(input.timestamp),
  };
}

export function deriveMovementHeading(
  location: TrackedLocation,
  previousLocation: TrackedLocation | undefined
): TrackedLocation {
  if (typeof location.headingDeg === 'number' || !previousLocation) {
    return location;
  }

  const nextTime = Date.parse(location.timestamp);
  const previousTime = Date.parse(previousLocation.timestamp);
  if (
    !Number.isFinite(nextTime) ||
    !Number.isFinite(previousTime) ||
    nextTime <= previousTime ||
    nextTime - previousTime > MAX_MOVEMENT_HEADING_FIX_GAP_MS
  ) {
    return location;
  }

  if (typeof location.speedKts === 'number' && location.speedKts < 2) {
    return location;
  }

  const distanceM = calculateDistanceNm(previousLocation.coordinates, location.coordinates) * METERS_PER_NM;
  const accuracyGateM = getMovementHeadingAccuracyGate(location, previousLocation);
  if (distanceM < accuracyGateM) {
    return location;
  }

  return {
    ...location,
    headingDeg: calculateTrueBearingDeg(previousLocation.coordinates, location.coordinates),
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
  if (state.status === 'tracking') return 'Aircraft tracking';
  if (state.status === 'requesting') return state.error ? 'GPS acquiring' : 'Locating';
  if (state.status === 'denied') return 'GPS blocked';
  if (state.status === 'unavailable') return 'GPS unavailable';
  if (state.status === 'error') return 'GPS error';
  return 'GPS off';
}

export function shouldKeepExistingTrackedLocation(
  nextLocation: TrackedLocation,
  currentLocation: TrackedLocation | undefined
): boolean {
  if (!currentLocation) return false;

  const nextTime = Date.parse(nextLocation.timestamp);
  const currentTime = Date.parse(currentLocation.timestamp);

  return Number.isFinite(nextTime) &&
    Number.isFinite(currentTime) &&
    nextTime < currentTime;
}

export function classifyBrowserLocationFailure(
  error: BrowserLocationErrorLike,
  options: BrowserLocationFailureOptions = {}
): BrowserLocationFailure {
  const permissionDeniedCode = error.PERMISSION_DENIED ?? 1;
  const positionUnavailableCode = error.POSITION_UNAVAILABLE ?? 2;
  const timeoutCode = error.TIMEOUT ?? 3;
  const phase = options.phase ?? 'initial-fix';
  const detail = formatBrowserLocationErrorDetail(error);

  if (error.code === permissionDeniedCode) {
    return {
      status: 'denied',
      message: `Location permission was denied. Enable browser and system Location Services for this browser, then try again.${detail}`,
    };
  }

  if (error.code === positionUnavailableCode) {
    if (phase === 'watch' && options.hasUsableFix) {
      return {
        status: 'requesting',
        message: `GPS refinement is temporarily unavailable; Halo is keeping the last aircraft position.${detail}`,
      };
    }

    return {
      status: 'unavailable',
      message: `Location permission is enabled, but the browser could not determine a position. Check OS Location Services for this browser, Precise Location, Wi-Fi/cellular signal, then try again.${detail}`,
    };
  }

  if (error.code === timeoutCode) {
    if (phase === 'watch' && options.hasUsableFix) {
      return {
        status: 'requesting',
        message: `GPS refinement timed out; Halo is keeping the last aircraft position.${detail}`,
      };
    }

    return {
      status: 'unavailable',
      message: `Location permission is enabled, but the browser timed out before returning a position. Move near a window or enable OS Location Services for this browser, then try again.${detail}`,
    };
  }

  return {
    status: 'error',
    message: error.message || 'Location tracking failed.',
  };
}

export function formatLocationWatchStartFailure(error: unknown): BrowserLocationFailure {
  const message = error instanceof Error ? error.message : String(error || '');

  return {
    status: 'unavailable',
    message: message
      ? `Location tracking could not start: ${message}. Check browser site permissions and system Location Services.`
      : 'Location tracking could not start. Check browser site permissions and system Location Services.',
  };
}

function formatBrowserLocationErrorDetail(error: BrowserLocationErrorLike): string {
  const message = typeof error.message === 'string' ? error.message.trim() : '';
  return message ? ` Browser message: ${message}` : '';
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

function getMovementHeadingAccuracyGate(
  location: TrackedLocation,
  previousLocation: TrackedLocation
): number {
  const accuracies = [location.accuracyM, previousLocation.accuracyM]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  if (accuracies.length === 0) return MIN_MOVEMENT_HEADING_DISTANCE_M;

  const averageAccuracy = accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length;
  return Math.max(
    MIN_MOVEMENT_HEADING_DISTANCE_M,
    Math.min(MAX_MOVEMENT_HEADING_ACCURACY_GATE_M, averageAccuracy)
  );
}

function finiteOptional(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeAccuracyMeters(value: number | null | undefined): number | undefined {
  const accuracy = finiteOptional(value);
  if (typeof accuracy !== 'number' || accuracy <= 0) return undefined;

  return Math.min(accuracy, MAX_RENDERABLE_ACCURACY_M);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
