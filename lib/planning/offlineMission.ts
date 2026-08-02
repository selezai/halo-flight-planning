import type {
  ActiveRouteState,
  AircraftProfile,
  Coordinates,
  LocationTrackingState,
  RouteAnalysis,
  Waypoint,
} from '@/types/planning';
import {
  formatDistance,
  formatDuration,
  formatFuel,
} from '@/lib/planning/navigation';

export const HALO_OFFLINE_MISSION_SNAPSHOT_KEY = 'halo-offline-active-mission';

export interface OfflineMissionSnapshot {
  version: 1;
  savedAt: string;
  routeName: string;
  departureTime: string;
  cruiseAltitudeFt: number;
  aircraft: {
    registration: string;
    type: string;
    cruiseSpeedKts: number;
    fuelBurnGph: number;
    usableFuelGal: number;
  };
  route: {
    waypointCount: number;
    legCount: number;
    totalDistanceNm: number;
    estimatedTimeMinutes: number;
    totalFuelRequiredGal: number;
    fuelRemainingGal: number;
    fuelStatus: RouteAnalysis['summary']['fuelStatus'];
    label: string;
  };
  waypoints: Array<{
    id: string;
    type: Waypoint['type'];
    name: string;
    ident?: string;
    coordinates: Coordinates;
    notes?: string;
  }>;
  activeRoute: Pick<
    ActiveRouteState,
    'status' | 'startedAt' | 'currentLegIndex' | 'nextWaypointId' | 'distanceToNextNm' | 'crossTrackErrorNm' | 'lastPositionAt'
  >;
  lastKnownPosition?: LocationTrackingState['position'];
}

export function buildOfflineMissionSnapshot(params: {
  routeName: string;
  departureTime: string;
  cruiseAltitudeFt: number;
  activeAircraft: AircraftProfile;
  waypoints: Waypoint[];
  route: RouteAnalysis;
  activeRoute: ActiveRouteState;
  locationTracking: LocationTrackingState;
  now?: Date;
}): OfflineMissionSnapshot {
  return {
    version: 1,
    savedAt: (params.now ?? new Date()).toISOString(),
    routeName: params.routeName,
    departureTime: params.departureTime,
    cruiseAltitudeFt: params.cruiseAltitudeFt,
    aircraft: {
      registration: params.activeAircraft.registration,
      type: params.activeAircraft.type,
      cruiseSpeedKts: params.activeAircraft.cruiseSpeedKts,
      fuelBurnGph: params.activeAircraft.fuelBurnGph,
      usableFuelGal: params.activeAircraft.usableFuelGal,
    },
    route: {
      waypointCount: params.route.summary.waypointCount,
      legCount: params.route.summary.legCount,
      totalDistanceNm: params.route.summary.totalDistanceNm,
      estimatedTimeMinutes: params.route.summary.estimatedTimeMinutes,
      totalFuelRequiredGal: params.route.summary.totalFuelRequiredGal,
      fuelRemainingGal: params.route.summary.fuelRemainingGal,
      fuelStatus: params.route.summary.fuelStatus,
      label: buildOfflineRouteLabel(params.waypoints, params.route),
    },
    waypoints: params.waypoints.map((waypoint) => ({
      id: waypoint.id,
      type: waypoint.type,
      name: waypoint.name,
      ident: waypoint.ident,
      coordinates: waypoint.coordinates,
      notes: waypoint.notes,
    })),
    activeRoute: {
      status: params.activeRoute.status,
      startedAt: params.activeRoute.startedAt,
      currentLegIndex: params.activeRoute.currentLegIndex,
      nextWaypointId: params.activeRoute.nextWaypointId,
      distanceToNextNm: params.activeRoute.distanceToNextNm,
      crossTrackErrorNm: params.activeRoute.crossTrackErrorNm,
      lastPositionAt: params.activeRoute.lastPositionAt,
    },
    lastKnownPosition: params.locationTracking.position,
  };
}

export function formatOfflineMissionSummary(snapshot: OfflineMissionSnapshot): string {
  return [
    snapshot.route.label,
    `${formatDistance(snapshot.route.totalDistanceNm)} · ${formatDuration(snapshot.route.estimatedTimeMinutes)}`,
    `${formatFuel(snapshot.route.totalFuelRequiredGal)} required · ${formatFuel(snapshot.route.fuelRemainingGal)} remaining`,
    `${snapshot.aircraft.registration} ${snapshot.aircraft.type}`,
  ].join(' · ');
}

function buildOfflineRouteLabel(waypoints: Waypoint[], route: RouteAnalysis): string {
  if (route.summary.legCount === 0) return 'No active route';

  const departure = waypoints[0];
  const destination = waypoints.at(-1);

  return [departure, destination]
    .map((waypoint) => waypoint?.ident ?? waypoint?.name)
    .filter(Boolean)
    .join(' → ') || 'Active route';
}
