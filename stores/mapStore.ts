import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedFeature } from '@/types/openaip';
import type {
  AircraftProfile,
  Coordinates,
  EmergencyLandingSite,
  FilingChecklistState,
  FlightPlanFilingRecord,
  FlightCloseReminder,
  NotamBriefingRecord,
  PersonalMinimums,
  RouteAirspaceReview,
  RouteNotamReview,
  TrainingWind,
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
import { insertWaypointAtRouteIndex } from '@/lib/planning/rubberBandRoute';
import { DEFAULT_TRAINING_WIND } from '@/lib/planning/trainingNavlog';
import { DEFAULT_WEIGHT_BALANCE_LOADING } from '@/lib/planning/weightBalance';

interface MapState {
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
  sidebarPanel: 'feature' | 'route' | 'weather' | 'aircraft' | 'briefing' | 'research';
  planningMode: boolean;

  // Planning state
  routeName: string;
  routeNotes: string;
  departureTime: string;
  cruiseAltitudeFt: number;
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
  setRouteName: (name: string) => void;
  setRouteNotes: (notes: string) => void;
  setDepartureTime: (time: string) => void;
  setCruiseAltitudeFt: (altitudeFt: number) => void;
  addRouteWaypoint: (waypoint: Waypoint) => void;
  insertRouteWaypoint: (index: number, waypoint: Waypoint) => void;
  addUserWaypoint: (coordinates: Coordinates) => void;
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
  return {
    ...current,
    ...persistedState,
    visibleLayers: {
      ...DEFAULT_VISIBLE_LAYERS,
      ...persistedState?.visibleLayers,
    },
    weightBalanceLoading: {
      ...DEFAULT_WEIGHT_BALANCE_LOADING,
      ...persistedState?.weightBalanceLoading,
      stationWeights: {
        ...DEFAULT_WEIGHT_BALANCE_LOADING.stationWeights,
        ...persistedState?.weightBalanceLoading?.stationWeights,
      },
    },
    trainingWind: {
      ...DEFAULT_TRAINING_WIND,
      ...persistedState?.trainingWind,
    },
    filingChecklist: {
      ...DEFAULT_FILING_CHECKLIST,
      ...persistedState?.filingChecklist,
    },
    notamBriefingRecord: {
      ...DEFAULT_NOTAM_BRIEFING_RECORD,
      ...(persistedState?.filingChecklist?.notamPibObtained && !persistedState?.notamBriefingRecord
        ? {
            status: 'completed' as const,
            method: 'Legacy Halo checklist',
            notes: 'Imported from previous “Official NOTAM PIB obtained” checklist state.',
          }
        : {}),
      ...persistedState?.notamBriefingRecord,
    },
    flightPlanFilingRecord: {
      ...DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      ...(persistedState?.filingChecklist?.filedViaOfficialSource && !persistedState?.flightPlanFilingRecord
        ? {
            status: 'filed-manually' as const,
            method: 'Legacy Halo checklist',
            notes: 'Imported from previous “Filed via official source” checklist state.',
          }
        : {}),
      ...persistedState?.flightPlanFilingRecord,
    },
    closeReminder: {
      ...DEFAULT_CLOSE_REMINDER,
      ...persistedState?.closeReminder,
    },
    emergencyLandingSites: persistedState?.emergencyLandingSites ?? [],
  };
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      // Default viewport - South Africa
      center: [28.0, -26.0],
      zoom: 7,
      
      // No feature selected initially
      selectedFeature: null,
      selectedFeatureCandidates: [],
      
      // All layers visible by default
      visibleLayers: DEFAULT_VISIBLE_LAYERS,
      
      // Sidebar state
      sidebarOpen: true,
      sidebarPanel: 'route',
      planningMode: true,

      // Planning defaults
      routeName: 'South Africa cross-country',
      routeNotes: '',
      departureTime: '',
      cruiseAltitudeFt: 6500,
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
      
      setSelectedFeature: (feature, candidates) => set({
        selectedFeature: feature,
        selectedFeatureCandidates: feature
          ? candidates?.length ? candidates : [feature]
          : [],
        sidebarPanel: feature ? 'feature' : 'route',
        sidebarOpen: true,
      }),
      
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
      setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
      
      clearSelection: () => set({ 
        selectedFeature: null,
        selectedFeatureCandidates: [],
        sidebarPanel: 'route',
      }),

      setPlanningMode: (enabled) => set({ planningMode: enabled }),
      setRouteName: (name) => set({ routeName: name }),
      setRouteNotes: (notes) => set({ routeNotes: notes }),
      setDepartureTime: (time) => set({ departureTime: time }),
      setCruiseAltitudeFt: (altitudeFt) => set({
        cruiseAltitudeFt: Math.max(0, Math.min(60000, Number(altitudeFt) || 0)),
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
        sidebarPanel: 'route',
        sidebarOpen: true,
      })),

      addUserWaypoint: (coordinates) => set((state) => ({
        waypoints: [
          ...state.waypoints,
          createUserWaypoint(coordinates, state.waypoints.length + 1),
        ],
        selectedFeature: null,
        selectedFeatureCandidates: [],
        sidebarPanel: 'route',
        sidebarOpen: true,
      })),

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
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        visibleLayers: state.visibleLayers,
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
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MapState> | undefined;

        return mergePersistedMapState(persistedState, current);
      },
    }
  )
);
