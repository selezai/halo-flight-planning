import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';
import type { ParsedFeature } from '@/types/openaip';
import type {
  ActiveRouteState,
  AircraftProfile,
  Coordinates,
  EmergencyLandingSite,
  FilingChecklistState,
  FlightPlanFilingRecord,
  FlightCloseReminder,
  HaloMissionPlannerState,
  HaloMissionRecord,
  HaloMissionStatus,
  LocationTrackingState,
  LocationTrackingStatus,
  NotamBriefingRecord,
  PersonalMinimums,
  RouteAirspaceReview,
  RouteNotamReview,
  TrainingWind,
  TrackedLocation,
  WeightBalanceLoading,
  Waypoint,
} from '@/types/planning';
import {
  DEFAULT_AIRCRAFT,
  DEFAULT_PERSONAL_MINIMUMS,
  clampAircraftProfile,
  clampPersonalMinimums,
} from '@/lib/planning/aircraft';
import { SOUTH_AFRICA_ATNS_FILE2FLY_URL } from '@/lib/planning/notams';
import { createUserWaypoint } from '@/lib/planning/navigation';
import { DEFAULT_CLOSE_REMINDER, DEFAULT_FILING_CHECKLIST } from '@/lib/planning/filingReminder';
import {
  DEFAULT_FLIGHT_PLAN_FILING_RECORD,
  DEFAULT_NOTAM_BRIEFING_RECORD,
} from '@/lib/planning/flightAdmin';
import {
  archiveMissionRecord,
  buildMissionDisplayName,
  cloneMissionPlannerState,
  createMissionRecord,
  sortMissionRecords,
  upsertMissionRecord,
} from '@/lib/planning/missions';
import { insertWaypointAtRouteIndex } from '@/lib/planning/rubberBandRoute';
import {
  calculateActiveRouteProgress,
  DEFAULT_ACTIVE_ROUTE_STATE,
  DEFAULT_LOCATION_TRACKING_STATE,
} from '@/lib/planning/routeTracking';
import { DEFAULT_TRAINING_WIND } from '@/lib/planning/trainingNavlog';
import { DEFAULT_WEIGHT_BALANCE_LOADING } from '@/lib/planning/weightBalance';
import type { HaloPanelId } from '@/lib/ui/halo';
import { normalizeHaloPanelId } from '@/lib/ui/halo';

export interface MapState {
  // Map viewport
  center: [number, number];
  zoom: number;
  
  // Selected feature
  selectedFeature: ParsedFeature | null;
  selectedFeatureCandidates: ParsedFeature[];
  
  // Layer visibility
  visibleLayers: {
    airports: boolean;
    navaids: boolean;
    airspaces: boolean;
    reportingPoints: boolean;
    obstacles: boolean;
    hotspots: boolean;
    hangGlidings: boolean;
    rcAirfields: boolean;
  };
  
  // UI state
  sidebarOpen: boolean;
  sidebarPanel: HaloPanelId;
  planningMode: boolean;
  routeEditingActive: boolean;
  aircraftTrackingEnabled: boolean;
  activeRoute: ActiveRouteState;
  locationTracking: LocationTrackingState;

  // Planning state
  routeName: string;
  routeNotes: string;
  departureTime: string;
  cruiseAltitudeFt: number;
  activeMissionId: string;
  missionLibrary: HaloMissionRecord[];
  waypoints: Waypoint[];
  activeAircraft: AircraftProfile;
  weightBalanceLoading: WeightBalanceLoading;
  personalMinimums: PersonalMinimums;
  routeAirspaceReview: RouteAirspaceReview;
  renderedRouteAirspaceReview: RouteAirspaceReview;
  coreRouteAirspaceReview: RouteAirspaceReview;
  routeNotamReview: RouteNotamReview;
  trainingWind: TrainingWind;
  filingChecklist: FilingChecklistState;
  notamBriefingRecord: NotamBriefingRecord;
  flightPlanFilingRecord: FlightPlanFilingRecord;
  closeReminder: FlightCloseReminder;
  emergencyLandingSites: EmergencyLandingSite[];
  
  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setViewport: (center: [number, number], zoom: number) => void;
  setSelectedFeature: (feature: ParsedFeature | null, candidates?: ParsedFeature[]) => void;
  toggleLayer: (layer: keyof MapState['visibleLayers']) => void;
  setLayerVisibility: (layer: keyof MapState['visibleLayers'], visible: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarPanel: (panel: MapState['sidebarPanel']) => void;
  clearSelection: () => void;
  setPlanningMode: (enabled: boolean) => void;
  setRouteEditingActive: (active: boolean) => void;
  startActiveRoute: () => void;
  stopActiveRoute: () => void;
  setAircraftTrackingEnabled: (enabled: boolean, options?: { keepLocationTrackingActive?: boolean }) => void;
  setLocationTrackingEnabled: (enabled: boolean) => void;
  setLocationFollowMode: (enabled: boolean) => void;
  setLocationTrackingStatus: (status: LocationTrackingStatus, error?: string) => void;
  setTrackedLocation: (location: TrackedLocation) => void;
  setRouteName: (name: string) => void;
  setRouteNotes: (notes: string) => void;
  setDepartureTime: (time: string) => void;
  setCruiseAltitudeFt: (altitudeFt: number) => void;
  saveActiveMission: (status?: HaloMissionStatus) => void;
  createBlankMission: () => void;
  duplicateActiveMission: () => void;
  loadMission: (id: string) => void;
  archiveMission: (id: string) => void;
  addRouteWaypoint: (waypoint: Waypoint) => void;
  insertRouteWaypoint: (index: number, waypoint: Waypoint) => void;
  addUserWaypoint: (coordinates: Coordinates) => string;
  removeRouteWaypoint: (id: string) => void;
  moveRouteWaypoint: (id: string, direction: 'up' | 'down') => void;
  updateRouteWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  clearRoute: () => void;
  setActiveAircraft: (aircraft: AircraftProfile) => void;
  updateActiveAircraft: (updates: Partial<AircraftProfile>) => void;
  updateWeightBalanceLoading: (updates: Partial<WeightBalanceLoading>) => void;
  updateWeightBalanceStationWeight: (stationId: string, weightLb: number) => void;
  updatePersonalMinimums: (updates: Partial<PersonalMinimums>) => void;
  setRenderedRouteAirspaceReview: (review: RouteAirspaceReview) => void;
  setCoreRouteAirspaceReview: (review: RouteAirspaceReview) => void;
  setRouteNotamReview: (review: RouteNotamReview) => void;
  updateTrainingWind: (updates: Partial<TrainingWind>) => void;
  updateFilingChecklist: (updates: Partial<FilingChecklistState>) => void;
  updateNotamBriefingRecord: (updates: Partial<NotamBriefingRecord>) => void;
  updateFlightPlanFilingRecord: (updates: Partial<FlightPlanFilingRecord>) => void;
  updateCloseReminder: (updates: Partial<FlightCloseReminder>) => void;
  addEmergencyLandingSite: (site: Omit<EmergencyLandingSite, 'id'>) => void;
  updateEmergencyLandingSite: (id: string, updates: Partial<EmergencyLandingSite>) => void;
  removeEmergencyLandingSite: (id: string) => void;
  restorePlannerSnapshotState: (snapshot: Record<string, unknown>) => void;
}

const DEFAULT_VISIBLE_LAYERS: MapState['visibleLayers'] = {
  airports: true,
  navaids: true,
  airspaces: true,
  reportingPoints: true,
  obstacles: true,
  hotspots: true,
  hangGlidings: true,
  rcAirfields: true,
};

const DEFAULT_ROUTE_AIRSPACE_REVIEW: RouteAirspaceReview = {
  source: 'rendered-vector',
  status: 'needs-route',
  message: 'Add at least two waypoints to review rendered OpenAIP airspace along the route.',
  alerts: [],
  sampledPointCount: 0,
  visibleLayerCount: 0,
};

const DEFAULT_CORE_ROUTE_AIRSPACE_REVIEW: RouteAirspaceReview = {
  source: 'openaip-core',
  status: 'needs-route',
  message: 'Add at least two waypoints to run the OpenAIP Core route corridor airspace review.',
  alerts: [],
  sampledPointCount: 0,
  visibleLayerCount: 0,
};

const DEFAULT_ROUTE_NOTAM_REVIEW: RouteNotamReview = {
  source: 'south-africa-official',
  status: 'needs-route',
  message: 'Add at least two route waypoints to prepare official South Africa NOTAM review.',
  notams: [],
  locations: [],
  queryCount: 0,
  sourceUrl: SOUTH_AFRICA_ATNS_FILE2FLY_URL,
};

const DEFAULT_ACTIVE_MISSION_ID = 'mission-local-active';
export const HALO_MAP_STORE_VERSION = 3;

function createMissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mission-${crypto.randomUUID()}`;
  }

  return `mission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlankMissionPlannerState(): HaloMissionPlannerState {
  return {
    center: [28.0, -26.0],
    zoom: 7,
    routeName: 'Untitled mission',
    routeNotes: '',
    departureTime: '',
    cruiseAltitudeFt: 6500,
    waypoints: [],
    activeAircraft: DEFAULT_AIRCRAFT,
    weightBalanceLoading: DEFAULT_WEIGHT_BALANCE_LOADING,
    trainingWind: DEFAULT_TRAINING_WIND,
    filingChecklist: DEFAULT_FILING_CHECKLIST,
    notamBriefingRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
    flightPlanFilingRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
    closeReminder: DEFAULT_CLOSE_REMINDER,
    emergencyLandingSites: [],
    personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
  };
}

function captureMissionPlannerState(state: MapState): HaloMissionPlannerState {
  return cloneMissionPlannerState({
    center: state.center,
    zoom: state.zoom,
    routeName: state.routeName,
    routeNotes: state.routeNotes,
    departureTime: state.departureTime,
    cruiseAltitudeFt: state.cruiseAltitudeFt,
    waypoints: state.waypoints,
    activeAircraft: state.activeAircraft,
    weightBalanceLoading: state.weightBalanceLoading,
    trainingWind: state.trainingWind,
    filingChecklist: state.filingChecklist,
    notamBriefingRecord: state.notamBriefingRecord,
    flightPlanFilingRecord: state.flightPlanFilingRecord,
    closeReminder: state.closeReminder,
    emergencyLandingSites: state.emergencyLandingSites,
    personalMinimums: state.personalMinimums,
  });
}

function buildSavedActiveMission(
  state: MapState,
  status?: HaloMissionStatus,
  now = new Date()
): HaloMissionRecord {
  const existing = state.missionLibrary.find((mission) => mission.id === state.activeMissionId);
  const resolvedStatus = status ?? (
    existing?.status && existing.status !== 'archived'
      ? existing.status
      : 'draft'
  );

  return createMissionRecord({
    id: state.activeMissionId || DEFAULT_ACTIVE_MISSION_ID,
    state: captureMissionPlannerState(state),
    status: resolvedStatus,
    now,
    existing,
  });
}

function getMissionActivationState(missionState: HaloMissionPlannerState): Partial<MapState> {
  return {
    center: missionState.center,
    zoom: missionState.zoom,
    routeName: missionState.routeName,
    routeNotes: missionState.routeNotes,
    departureTime: missionState.departureTime,
    cruiseAltitudeFt: missionState.cruiseAltitudeFt,
    waypoints: missionState.waypoints,
    activeAircraft: clampAircraftProfile(missionState.activeAircraft),
    weightBalanceLoading: {
      ...DEFAULT_WEIGHT_BALANCE_LOADING,
      ...missionState.weightBalanceLoading,
      stationWeights: {
        ...DEFAULT_WEIGHT_BALANCE_LOADING.stationWeights,
        ...missionState.weightBalanceLoading.stationWeights,
      },
    },
    trainingWind: {
      ...DEFAULT_TRAINING_WIND,
      ...missionState.trainingWind,
    },
    filingChecklist: {
      ...DEFAULT_FILING_CHECKLIST,
      ...missionState.filingChecklist,
    },
    notamBriefingRecord: {
      ...DEFAULT_NOTAM_BRIEFING_RECORD,
      ...missionState.notamBriefingRecord,
    },
    flightPlanFilingRecord: {
      ...DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      ...missionState.flightPlanFilingRecord,
    },
    closeReminder: {
      ...DEFAULT_CLOSE_REMINDER,
      ...missionState.closeReminder,
    },
    emergencyLandingSites: missionState.emergencyLandingSites,
    personalMinimums: clampPersonalMinimums(missionState.personalMinimums),
    routeAirspaceReview: DEFAULT_ROUTE_AIRSPACE_REVIEW,
    renderedRouteAirspaceReview: DEFAULT_ROUTE_AIRSPACE_REVIEW,
    coreRouteAirspaceReview: DEFAULT_CORE_ROUTE_AIRSPACE_REVIEW,
    routeNotamReview: DEFAULT_ROUTE_NOTAM_REVIEW,
    selectedFeature: null,
    selectedFeatureCandidates: [],
    sidebarPanel: 'route',
    activeRoute: DEFAULT_ACTIVE_ROUTE_STATE,
  };
}

function normalizeMissionLibrary(value: unknown): HaloMissionRecord[] {
  if (!Array.isArray(value)) return [];

  return sortMissionRecords(
    value
      .map(normalizeMissionRecord)
      .filter((mission): mission is HaloMissionRecord => Boolean(mission))
  );
}

function isMissionRecord(value: unknown): value is HaloMissionRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<HaloMissionRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.status === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    Boolean(record.state) &&
    typeof record.state === 'object'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeCoordinates(value: unknown, fallback: Coordinates): Coordinates {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  ) {
    return [value[0], value[1]];
  }

  return fallback;
}

function normalizeWaypointType(value: unknown): Waypoint['type'] {
  return value === 'airport' ||
    value === 'navaid' ||
    value === 'reporting-point' ||
    value === 'user'
    ? value
    : 'user';
}

function normalizeWaypoint(value: unknown, index: number): Waypoint | null {
  if (!isRecord(value)) return null;

  const coordinates = normalizeCoordinates(value.coordinates, [NaN, NaN]);
  if (!Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;

  const ident = typeof value.ident === 'string' ? value.ident : undefined;
  const name = normalizeString(value.name, ident || `Waypoint ${index + 1}`);

  return {
    id: normalizeString(value.id, `waypoint-${index + 1}`),
    type: normalizeWaypointType(value.type),
    name,
    ident,
    coordinates,
    elevationFt: typeof value.elevationFt === 'number' && Number.isFinite(value.elevationFt)
      ? value.elevationFt
      : undefined,
    sourceId: typeof value.sourceId === 'string' ? value.sourceId : undefined,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  };
}

function normalizeWaypoints(value: unknown, fallback: Waypoint[] = []): Waypoint[] {
  if (!Array.isArray(value)) return fallback;

  return value
    .map((waypoint, index) => normalizeWaypoint(waypoint, index))
    .filter((waypoint): waypoint is Waypoint => Boolean(waypoint));
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] =>
      typeof entry[1] === 'number' && Number.isFinite(entry[1])
    )
  );
}

function normalizeVisibleLayers(
  value: unknown,
  fallback: MapState['visibleLayers'] = DEFAULT_VISIBLE_LAYERS
): MapState['visibleLayers'] {
  const record = isRecord(value) ? value : {};

  return {
    airports: typeof record.airports === 'boolean' ? record.airports : fallback.airports,
    navaids: typeof record.navaids === 'boolean' ? record.navaids : fallback.navaids,
    airspaces: typeof record.airspaces === 'boolean' ? record.airspaces : fallback.airspaces,
    reportingPoints: typeof record.reportingPoints === 'boolean'
      ? record.reportingPoints
      : fallback.reportingPoints,
    obstacles: typeof record.obstacles === 'boolean' ? record.obstacles : fallback.obstacles,
    hotspots: typeof record.hotspots === 'boolean' ? record.hotspots : fallback.hotspots,
    hangGlidings: typeof record.hangGlidings === 'boolean' ? record.hangGlidings : fallback.hangGlidings,
    rcAirfields: typeof record.rcAirfields === 'boolean' ? record.rcAirfields : fallback.rcAirfields,
  };
}

function normalizeAircraftProfile(value: unknown, fallback: AircraftProfile = DEFAULT_AIRCRAFT): AircraftProfile {
  if (!isRecord(value)) return fallback;

  return clampAircraftProfile({
    ...fallback,
    id: normalizeString(value.id, fallback.id),
    registration: normalizeString(value.registration, fallback.registration),
    type: normalizeString(value.type, fallback.type),
    name: normalizeString(value.name, fallback.name),
    cruiseSpeedKts: normalizeNumber(value.cruiseSpeedKts, fallback.cruiseSpeedKts),
    fuelBurnGph: normalizeNumber(value.fuelBurnGph, fallback.fuelBurnGph),
    usableFuelGal: normalizeNumber(value.usableFuelGal, fallback.usableFuelGal),
    reserveMinutes: normalizeNumber(value.reserveMinutes, fallback.reserveMinutes),
    contingencyPercent: normalizeNumber(value.contingencyPercent, fallback.contingencyPercent),
    magneticVariationDeg: normalizeNumber(value.magneticVariationDeg, fallback.magneticVariationDeg),
    compassDeviationDeg: normalizeNumber(value.compassDeviationDeg, fallback.compassDeviationDeg ?? 0),
    glideRatio: normalizeNumber(value.glideRatio, fallback.glideRatio ?? 9),
    weightBalance: isRecord(value.weightBalance)
      ? value.weightBalance as unknown as AircraftProfile['weightBalance']
      : fallback.weightBalance,
  });
}

function normalizeMissionStatus(value: unknown): HaloMissionStatus {
  return value === 'ready' || value === 'needs-review' || value === 'flown' || value === 'archived'
    ? value
    : 'draft';
}

function normalizeMissionRecord(value: unknown): HaloMissionRecord | null {
  if (!isMissionRecord(value)) return null;

  const state: Record<string, unknown> = isRecord(value.state) ? value.state : {};
  const weightBalanceLoading: Record<string, unknown> = isRecord(state.weightBalanceLoading)
    ? state.weightBalanceLoading
    : {};
  const updatedAtMs = Date.parse(value.updatedAt);

  return createMissionRecord({
    id: value.id,
    status: normalizeMissionStatus(value.status),
    now: Number.isFinite(updatedAtMs) ? new Date(updatedAtMs) : new Date(),
    name: value.name,
    existing: value,
    state: {
      ...createBlankMissionPlannerState(),
      center: normalizeCoordinates(state.center, [28.0, -26.0]),
      zoom: normalizeNumber(state.zoom, 7),
      routeName: normalizeString(state.routeName, value.name),
      routeNotes: normalizeString(state.routeNotes, ''),
      departureTime: normalizeString(state.departureTime, ''),
      cruiseAltitudeFt: normalizeNumber(state.cruiseAltitudeFt, 6500),
      waypoints: normalizeWaypoints(state.waypoints),
      activeAircraft: normalizeAircraftProfile(state.activeAircraft),
      weightBalanceLoading: {
        ...DEFAULT_WEIGHT_BALANCE_LOADING,
        ...weightBalanceLoading,
        stationWeights: {
          ...DEFAULT_WEIGHT_BALANCE_LOADING.stationWeights,
          ...normalizeNumberRecord(weightBalanceLoading.stationWeights),
        },
      },
      trainingWind: {
        ...DEFAULT_TRAINING_WIND,
        ...(isRecord(state.trainingWind) ? state.trainingWind : {}),
      },
      filingChecklist: {
        ...DEFAULT_FILING_CHECKLIST,
        ...(isRecord(state.filingChecklist) ? state.filingChecklist : {}),
      },
      notamBriefingRecord: {
        ...DEFAULT_NOTAM_BRIEFING_RECORD,
        ...(isRecord(state.notamBriefingRecord) ? state.notamBriefingRecord : {}),
      },
      flightPlanFilingRecord: {
        ...DEFAULT_FLIGHT_PLAN_FILING_RECORD,
        ...(isRecord(state.flightPlanFilingRecord) ? state.flightPlanFilingRecord : {}),
      },
      closeReminder: {
        ...DEFAULT_CLOSE_REMINDER,
        ...(isRecord(state.closeReminder) ? state.closeReminder : {}),
      },
      emergencyLandingSites: Array.isArray(state.emergencyLandingSites)
        ? state.emergencyLandingSites as unknown as EmergencyLandingSite[]
        : [],
      personalMinimums: clampPersonalMinimums(
        isRecord(state.personalMinimums)
          ? state.personalMinimums as unknown as PersonalMinimums
          : DEFAULT_PERSONAL_MINIMUMS
      ),
    },
  });
}

function chooseActiveAirspaceReview(
  coreReview: RouteAirspaceReview,
  renderedReview: RouteAirspaceReview
): RouteAirspaceReview {
  if (['checking', 'complete', 'partial', 'rate-limited'].includes(coreReview.status)) {
    return coreReview;
  }

  if (renderedReview.status !== 'needs-route' && renderedReview.status !== 'map-loading') {
    return renderedReview;
  }

  return coreReview.status === 'unavailable' ? coreReview : renderedReview;
}

function mergePersistedMapState(
  persistedState: Partial<MapState> | undefined,
  current: MapState
): MapState {
  const missionLibrary = normalizeMissionLibrary(persistedState?.missionLibrary);
  const persistedActiveMissionId = typeof persistedState?.activeMissionId === 'string'
    ? persistedState.activeMissionId
    : undefined;
  const weightBalanceLoading: Record<string, unknown> = isRecord(persistedState?.weightBalanceLoading)
    ? persistedState.weightBalanceLoading
    : {};

  return {
    ...current,
    ...persistedState,
    center: normalizeCoordinates(persistedState?.center, current.center),
    zoom: normalizeNumber(persistedState?.zoom, current.zoom),
    routeName: normalizeString(persistedState?.routeName, current.routeName),
    routeNotes: normalizeString(persistedState?.routeNotes, current.routeNotes),
    departureTime: normalizeString(persistedState?.departureTime, current.departureTime),
    cruiseAltitudeFt: normalizeNumber(persistedState?.cruiseAltitudeFt, current.cruiseAltitudeFt),
    activeMissionId: persistedActiveMissionId || current.activeMissionId,
    missionLibrary,
    waypoints: normalizeWaypoints(persistedState?.waypoints, current.waypoints),
    activeAircraft: normalizeAircraftProfile(persistedState?.activeAircraft, current.activeAircraft),
    visibleLayers: normalizeVisibleLayers(persistedState?.visibleLayers, current.visibleLayers),
    activeRoute: DEFAULT_ACTIVE_ROUTE_STATE,
    locationTracking: DEFAULT_LOCATION_TRACKING_STATE,
    aircraftTrackingEnabled: typeof persistedState?.aircraftTrackingEnabled === 'boolean'
      ? persistedState.aircraftTrackingEnabled
      : current.aircraftTrackingEnabled,
    sidebarPanel: normalizeHaloPanelId(persistedState?.sidebarPanel),
    weightBalanceLoading: {
      ...DEFAULT_WEIGHT_BALANCE_LOADING,
      ...current.weightBalanceLoading,
      ...weightBalanceLoading,
      stationWeights: {
        ...DEFAULT_WEIGHT_BALANCE_LOADING.stationWeights,
        ...current.weightBalanceLoading.stationWeights,
        ...normalizeNumberRecord(weightBalanceLoading.stationWeights),
      },
    },
    trainingWind: {
      ...DEFAULT_TRAINING_WIND,
      ...current.trainingWind,
      ...(isRecord(persistedState?.trainingWind) ? persistedState.trainingWind : {}),
    },
    filingChecklist: {
      ...DEFAULT_FILING_CHECKLIST,
      ...current.filingChecklist,
      ...(isRecord(persistedState?.filingChecklist) ? persistedState.filingChecklist : {}),
    },
    notamBriefingRecord: {
      ...DEFAULT_NOTAM_BRIEFING_RECORD,
      ...current.notamBriefingRecord,
      ...(persistedState?.filingChecklist?.notamPibObtained && !persistedState?.notamBriefingRecord
        ? {
            status: 'completed' as const,
            method: 'Legacy Halo checklist',
            notes: 'Imported from previous “Official NOTAM PIB obtained” checklist state.',
          }
        : {}),
      ...(isRecord(persistedState?.notamBriefingRecord) ? persistedState.notamBriefingRecord : {}),
    },
    flightPlanFilingRecord: {
      ...DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      ...current.flightPlanFilingRecord,
      ...(persistedState?.filingChecklist?.filedViaOfficialSource && !persistedState?.flightPlanFilingRecord
        ? {
            status: 'filed-manually' as const,
            method: 'Legacy Halo checklist',
            notes: 'Imported from previous “Filed via official source” checklist state.',
          }
        : {}),
      ...(isRecord(persistedState?.flightPlanFilingRecord) ? persistedState.flightPlanFilingRecord : {}),
    },
    closeReminder: {
      ...DEFAULT_CLOSE_REMINDER,
      ...current.closeReminder,
      ...(isRecord(persistedState?.closeReminder) ? persistedState.closeReminder : {}),
    },
    emergencyLandingSites: Array.isArray(persistedState?.emergencyLandingSites)
      ? persistedState.emergencyLandingSites
      : [],
    personalMinimums: clampPersonalMinimums(
      isRecord(persistedState?.personalMinimums)
        ? persistedState.personalMinimums as PersonalMinimums
        : current.personalMinimums
    ),
  };
}

export function migratePersistedMapState(persistedState: unknown, persistedVersion: number): Partial<MapState> {
  if (!isRecord(persistedState)) return {};

  const migrated = {
    ...persistedState,
  } as Partial<MapState>;

  if (persistedVersion < 3) {
    delete migrated.activeRoute;
    delete migrated.locationTracking;
    delete migrated.selectedFeature;
    delete migrated.selectedFeatureCandidates;
    delete migrated.routeEditingActive;

    migrated.aircraftTrackingEnabled = false;
  }

  return migrated;
}

export const useMapStore = createWithEqualityFn<MapState>()(
  persist(
    (set, get) => ({
      // Default viewport - South Africa
      center: [28.0, -26.0],
      zoom: 7,
      
      // No feature selected initially
      selectedFeature: null,
      selectedFeatureCandidates: [],
      
      // All layers visible by default
      visibleLayers: DEFAULT_VISIBLE_LAYERS,
      
      // Sidebar state
      sidebarOpen: false,
      sidebarPanel: 'route',
      planningMode: true,
      routeEditingActive: false,
      aircraftTrackingEnabled: false,
      activeRoute: DEFAULT_ACTIVE_ROUTE_STATE,
      locationTracking: DEFAULT_LOCATION_TRACKING_STATE,

      // Planning defaults
      routeName: 'South Africa cross-country',
      routeNotes: '',
      departureTime: '',
      cruiseAltitudeFt: 6500,
      activeMissionId: DEFAULT_ACTIVE_MISSION_ID,
      missionLibrary: [],
      waypoints: [],
      activeAircraft: DEFAULT_AIRCRAFT,
      weightBalanceLoading: DEFAULT_WEIGHT_BALANCE_LOADING,
      personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
      routeAirspaceReview: DEFAULT_ROUTE_AIRSPACE_REVIEW,
      renderedRouteAirspaceReview: DEFAULT_ROUTE_AIRSPACE_REVIEW,
      coreRouteAirspaceReview: DEFAULT_CORE_ROUTE_AIRSPACE_REVIEW,
      routeNotamReview: DEFAULT_ROUTE_NOTAM_REVIEW,
      trainingWind: DEFAULT_TRAINING_WIND,
      filingChecklist: DEFAULT_FILING_CHECKLIST,
      notamBriefingRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
      flightPlanFilingRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      closeReminder: DEFAULT_CLOSE_REMINDER,
      emergencyLandingSites: [],
      
      // Actions
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setViewport: (center, zoom) => set({ center, zoom }),
      
      setSelectedFeature: (feature, candidates) => set((state) => ({
        selectedFeature: feature,
        selectedFeatureCandidates: feature
          ? candidates?.length ? candidates : [feature]
          : [],
        sidebarPanel: feature ? state.sidebarPanel : 'route',
        sidebarOpen: true,
      })),
      
      toggleLayer: (layer) => set((state) => ({
        visibleLayers: {
          ...state.visibleLayers,
          [layer]: !state.visibleLayers[layer],
        },
      })),
      
      setLayerVisibility: (layer, visible) => set((state) => ({
        visibleLayers: {
          ...state.visibleLayers,
          [layer]: visible,
        },
      })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarPanel: (panel) => set({ sidebarPanel: normalizeHaloPanelId(panel) }),
      
      clearSelection: () => set({ 
        selectedFeature: null,
        selectedFeatureCandidates: [],
        sidebarPanel: 'route',
      }),

      setPlanningMode: (enabled) => set({ planningMode: enabled }),
      setRouteEditingActive: (active) => set({ routeEditingActive: active }),

      startActiveRoute: () => set((state) => {
        if (state.waypoints.length < 2) {
          return {
            activeRoute: DEFAULT_ACTIVE_ROUTE_STATE,
          };
        }

        const progress = state.locationTracking.status === 'tracking' && state.locationTracking.position
          ? calculateActiveRouteProgress(state.waypoints, state.locationTracking.position)
          : {
              currentLegIndex: 0,
              nextWaypointId: state.waypoints[1]?.id,
            };

        return {
          activeRoute: {
            status: 'active',
            startedAt: new Date().toISOString(),
            currentLegIndex: progress.currentLegIndex,
            nextWaypointId: progress.nextWaypointId,
            distanceToNextNm: progress.distanceToNextNm,
            crossTrackErrorNm: progress.crossTrackErrorNm,
            lastPositionAt: state.locationTracking.position?.timestamp,
          },
          planningMode: false,
          selectedFeature: null,
          selectedFeatureCandidates: [],
        };
      }),

      stopActiveRoute: () => set((state) => ({
        activeRoute: {
          ...DEFAULT_ACTIVE_ROUTE_STATE,
          status: 'stopped',
          stoppedAt: new Date().toISOString(),
          currentLegIndex: state.activeRoute.currentLegIndex,
          nextWaypointId: state.activeRoute.nextWaypointId,
          distanceToNextNm: state.activeRoute.distanceToNextNm,
          crossTrackErrorNm: state.activeRoute.crossTrackErrorNm,
          lastPositionAt: state.activeRoute.lastPositionAt,
        },
      })),

      setAircraftTrackingEnabled: (enabled, options) => set((state) => {
        if (enabled && state.locationTracking.enabled) {
          return {
            aircraftTrackingEnabled: true,
            locationTracking: {
              ...state.locationTracking,
              followMode: true,
              status: state.locationTracking.status === 'idle'
                ? 'requesting'
                : state.locationTracking.status,
            },
          };
        }

        if (!enabled && options?.keepLocationTrackingActive && state.locationTracking.enabled) {
          return {
            aircraftTrackingEnabled: false,
            locationTracking: {
              ...state.locationTracking,
              followMode: true,
            },
          };
        }

        return {
          aircraftTrackingEnabled: enabled,
          locationTracking: {
            ...state.locationTracking,
            enabled,
            followMode: enabled,
            status: enabled ? 'requesting' : 'idle',
            error: undefined,
            position: enabled ? state.locationTracking.position : undefined,
            lastUpdatedAt: enabled ? state.locationTracking.lastUpdatedAt : undefined,
          },
        };
      }),

      setLocationTrackingEnabled: (enabled) => set((state) => ({
        locationTracking: {
          ...state.locationTracking,
          enabled,
          followMode: enabled ? state.locationTracking.followMode : false,
          status: enabled ? 'requesting' : 'idle',
          error: undefined,
          position: enabled ? state.locationTracking.position : undefined,
          lastUpdatedAt: enabled ? state.locationTracking.lastUpdatedAt : undefined,
        },
      })),

      setLocationFollowMode: (enabled) => set((state) => ({
        locationTracking: {
          ...state.locationTracking,
          followMode: enabled,
        },
      })),

      setLocationTrackingStatus: (status, error) => set((state) => {
        const terminal = status === 'idle' || status === 'denied' || status === 'unavailable' || status === 'error';
        const permissionTerminal = status === 'denied' || status === 'unavailable' || status === 'error';

        return {
          aircraftTrackingEnabled: permissionTerminal ? false : state.aircraftTrackingEnabled,
          locationTracking: {
            ...state.locationTracking,
            status,
            enabled: terminal ? false : state.locationTracking.enabled,
            followMode: terminal ? false : state.locationTracking.followMode,
            error,
            position: terminal ? undefined : state.locationTracking.position,
            lastUpdatedAt: status === 'tracking'
              ? state.locationTracking.lastUpdatedAt
              : new Date().toISOString(),
          },
        };
      }),

      setTrackedLocation: (location) => set((state) => {
        const progress = state.activeRoute.status === 'active'
          ? calculateActiveRouteProgress(state.waypoints, location)
          : undefined;

        return {
          locationTracking: {
            ...state.locationTracking,
            enabled: true,
            status: 'tracking',
            position: location,
            error: undefined,
            lastUpdatedAt: location.timestamp,
          },
          activeRoute: progress
            ? {
                ...state.activeRoute,
                currentLegIndex: progress.currentLegIndex,
                nextWaypointId: progress.nextWaypointId,
                distanceToNextNm: progress.distanceToNextNm,
                crossTrackErrorNm: progress.crossTrackErrorNm,
                lastPositionAt: location.timestamp,
              }
            : state.activeRoute,
        };
      }),

      setRouteName: (name) => set({ routeName: name }),
      setRouteNotes: (notes) => set({ routeNotes: notes }),
      setDepartureTime: (time) => set({ departureTime: time }),
      setCruiseAltitudeFt: (altitudeFt) => set({
        cruiseAltitudeFt: Math.max(0, Math.min(60000, Number(altitudeFt) || 0)),
      }),

      saveActiveMission: (status) => set((state) => {
        const record = buildSavedActiveMission(state, status);

        return {
          activeMissionId: record.id,
          routeName: record.state.routeName,
          missionLibrary: upsertMissionRecord(state.missionLibrary, record),
        };
      }),

      createBlankMission: () => set((state) => {
        const now = new Date();
        const savedActive = buildSavedActiveMission(state, undefined, now);
        const blankId = createMissionId();
        const blankState = createBlankMissionPlannerState();
        const blankRecord = createMissionRecord({
          id: blankId,
          state: blankState,
          status: 'draft',
          now,
        });

        return {
          ...getMissionActivationState(blankRecord.state),
          activeMissionId: blankId,
          missionLibrary: upsertMissionRecord(
            upsertMissionRecord(state.missionLibrary, savedActive),
            blankRecord
          ),
          sidebarOpen: true,
        };
      }),

      duplicateActiveMission: () => set((state) => {
        const now = new Date();
        const savedActive = buildSavedActiveMission(state, undefined, now);
        const duplicateId = createMissionId();
        const duplicateName = `Copy of ${buildMissionDisplayName(state.routeName, state.waypoints)}`;
        const duplicateRecord = createMissionRecord({
          id: duplicateId,
          state: {
            ...captureMissionPlannerState(state),
            routeName: duplicateName,
          },
          status: 'draft',
          now,
          name: duplicateName,
        });

        return {
          ...getMissionActivationState(duplicateRecord.state),
          activeMissionId: duplicateId,
          missionLibrary: upsertMissionRecord(
            upsertMissionRecord(state.missionLibrary, savedActive),
            duplicateRecord
          ),
          sidebarOpen: true,
        };
      }),

      loadMission: (id) => set((state) => {
        const target = state.missionLibrary.find((mission) => mission.id === id);
        if (!target || target.status === 'archived') return state;

        const savedActive = buildSavedActiveMission(state);

        return {
          ...getMissionActivationState(target.state),
          activeMissionId: target.id,
          missionLibrary: upsertMissionRecord(state.missionLibrary, savedActive),
          sidebarOpen: true,
        };
      }),

      archiveMission: (id) => set((state) => {
        const target = state.missionLibrary.find((mission) => mission.id === id);
        if (!target) return state;

        const archivedMission = archiveMissionRecord(target);
        const missionLibrary = upsertMissionRecord(state.missionLibrary, archivedMission);

        if (id !== state.activeMissionId) {
          return { missionLibrary };
        }

        const blankId = createMissionId();
        const blankRecord = createMissionRecord({
          id: blankId,
          state: createBlankMissionPlannerState(),
          status: 'draft',
        });

        return {
          ...getMissionActivationState(blankRecord.state),
          activeMissionId: blankId,
          missionLibrary: upsertMissionRecord(missionLibrary, blankRecord),
          sidebarOpen: true,
        };
      }),

      addRouteWaypoint: (waypoint) => set((state) => ({
        waypoints: [
          ...state.waypoints,
          {
            ...waypoint,
            id: `${waypoint.id || waypoint.type}-${Date.now()}-${state.waypoints.length + 1}`,
          },
        ],
        selectedFeature: null,
        selectedFeatureCandidates: [],
        sidebarPanel: 'route',
        sidebarOpen: true,
      })),

      insertRouteWaypoint: (index, waypoint) => set((state) => ({
        waypoints: insertWaypointAtRouteIndex(state.waypoints, {
          ...waypoint,
          id: waypoint.id || `${waypoint.type}-${Date.now()}-${index}`,
        }, index),
        selectedFeature: null,
        selectedFeatureCandidates: [],
      })),

      addUserWaypoint: (coordinates) => {
        const state = get();
        const waypoint = createUserWaypoint(coordinates, state.waypoints.length + 1);

        set({
          waypoints: [
            ...state.waypoints,
            waypoint,
          ],
          selectedFeature: null,
          selectedFeatureCandidates: [],
        });

        return waypoint.id;
      },

      removeRouteWaypoint: (id) => set((state) => ({
        waypoints: state.waypoints.filter((waypoint) => waypoint.id !== id),
      })),

      moveRouteWaypoint: (id, direction) => set((state) => {
        const index = state.waypoints.findIndex((waypoint) => waypoint.id === id);
        if (index === -1) return state;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= state.waypoints.length) return state;

        const waypoints = [...state.waypoints];
        const [waypoint] = waypoints.splice(index, 1);
        waypoints.splice(targetIndex, 0, waypoint);
        return { waypoints };
      }),

      updateRouteWaypoint: (id, updates) => set((state) => ({
        waypoints: state.waypoints.map((waypoint) =>
          waypoint.id === id ? { ...waypoint, ...updates } : waypoint
        ),
      })),

      clearRoute: () => set({
        waypoints: [],
        routeAirspaceReview: DEFAULT_ROUTE_AIRSPACE_REVIEW,
        renderedRouteAirspaceReview: DEFAULT_ROUTE_AIRSPACE_REVIEW,
        coreRouteAirspaceReview: DEFAULT_CORE_ROUTE_AIRSPACE_REVIEW,
        routeNotamReview: DEFAULT_ROUTE_NOTAM_REVIEW,
        activeRoute: DEFAULT_ACTIVE_ROUTE_STATE,
      }),

      setActiveAircraft: (aircraft) => set({
        activeAircraft: clampAircraftProfile(aircraft),
        weightBalanceLoading: DEFAULT_WEIGHT_BALANCE_LOADING,
      }),

      updateActiveAircraft: (updates) => set((state) => ({
        activeAircraft: clampAircraftProfile({ ...state.activeAircraft, ...updates }),
      })),

      updateWeightBalanceLoading: (updates) => set((state) => ({
        weightBalanceLoading: {
          ...state.weightBalanceLoading,
          ...updates,
          stationWeights: {
            ...state.weightBalanceLoading.stationWeights,
            ...updates.stationWeights,
          },
        },
      })),

      updateWeightBalanceStationWeight: (stationId, weightLb) => set((state) => ({
        weightBalanceLoading: {
          ...state.weightBalanceLoading,
          stationWeights: {
            ...state.weightBalanceLoading.stationWeights,
            [stationId]: Number.isFinite(weightLb) ? Math.max(0, weightLb) : 0,
          },
        },
      })),

      updatePersonalMinimums: (updates) => set((state) => ({
        personalMinimums: clampPersonalMinimums({ ...state.personalMinimums, ...updates }),
      })),

      setRenderedRouteAirspaceReview: (review) => set((state) => ({
        renderedRouteAirspaceReview: review,
        routeAirspaceReview: chooseActiveAirspaceReview(state.coreRouteAirspaceReview, review),
      })),

      setCoreRouteAirspaceReview: (review) => set((state) => ({
        coreRouteAirspaceReview: review,
        routeAirspaceReview: chooseActiveAirspaceReview(review, state.renderedRouteAirspaceReview),
      })),

      setRouteNotamReview: (review) => set({
        routeNotamReview: review,
      }),

      updateTrainingWind: (updates) => set((state) => ({
        trainingWind: {
          directionDeg: Number.isFinite(updates.directionDeg)
            ? Number(updates.directionDeg)
            : state.trainingWind.directionDeg,
          speedKts: Number.isFinite(updates.speedKts)
            ? Math.max(0, Number(updates.speedKts))
            : state.trainingWind.speedKts,
        },
      })),

      updateFilingChecklist: (updates) => set((state) => ({
        filingChecklist: {
          ...state.filingChecklist,
          ...updates,
        },
      })),

      updateNotamBriefingRecord: (updates) => set((state) => ({
        notamBriefingRecord: {
          ...state.notamBriefingRecord,
          ...updates,
        },
      })),

      updateFlightPlanFilingRecord: (updates) => set((state) => ({
        flightPlanFilingRecord: {
          ...state.flightPlanFilingRecord,
          ...updates,
        },
      })),

      updateCloseReminder: (updates) => set((state) => ({
        closeReminder: {
          ...state.closeReminder,
          ...updates,
        },
      })),

      addEmergencyLandingSite: (site) => set((state) => ({
        emergencyLandingSites: [
          ...state.emergencyLandingSites,
          {
            ...site,
            id: `emergency-site-${Date.now()}-${state.emergencyLandingSites.length + 1}`,
          },
        ],
      })),

      updateEmergencyLandingSite: (id, updates) => set((state) => ({
        emergencyLandingSites: state.emergencyLandingSites.map((site) =>
          site.id === id ? { ...site, ...updates } : site
        ),
      })),

      removeEmergencyLandingSite: (id) => set((state) => ({
        emergencyLandingSites: state.emergencyLandingSites.filter((site) => site.id !== id),
      })),

      restorePlannerSnapshotState: (snapshot) => set((state) =>
        mergePersistedMapState(snapshot as Partial<MapState>, state)
      ),
    }),
    {
      name: 'halo-map-store',
      version: HALO_MAP_STORE_VERSION,
      migrate: migratePersistedMapState,
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        visibleLayers: state.visibleLayers,
        aircraftTrackingEnabled: state.aircraftTrackingEnabled,
        sidebarPanel: state.sidebarPanel,
        routeName: state.routeName,
        routeNotes: state.routeNotes,
        departureTime: state.departureTime,
        cruiseAltitudeFt: state.cruiseAltitudeFt,
        activeMissionId: state.activeMissionId,
        missionLibrary: state.missionLibrary,
        waypoints: state.waypoints,
        activeAircraft: state.activeAircraft,
        weightBalanceLoading: state.weightBalanceLoading,
        trainingWind: state.trainingWind,
        filingChecklist: state.filingChecklist,
        notamBriefingRecord: state.notamBriefingRecord,
        flightPlanFilingRecord: state.flightPlanFilingRecord,
        closeReminder: state.closeReminder,
        emergencyLandingSites: state.emergencyLandingSites,
        personalMinimums: state.personalMinimums,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MapState> | undefined;

        return mergePersistedMapState(persistedState, current);
      },
    }
  )
);
