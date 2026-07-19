import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedFeature } from '@/types/openaip';
import type {
  AircraftProfile,
  Coordinates,
  PersonalMinimums,
  Waypoint,
} from '@/types/planning';
import {
  DEFAULT_AIRCRAFT,
  DEFAULT_PERSONAL_MINIMUMS,
  clampAircraftProfile,
  clampPersonalMinimums,
} from '@/lib/planning/aircraft';
import { createUserWaypoint } from '@/lib/planning/navigation';

interface MapState {
  // Map viewport
  center: [number, number];
  zoom: number;
  
  // Selected feature
  selectedFeature: ParsedFeature | null;
  
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
  personalMinimums: PersonalMinimums;
  
  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setViewport: (center: [number, number], zoom: number) => void;
  setSelectedFeature: (feature: ParsedFeature | null) => void;
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
  addUserWaypoint: (coordinates: Coordinates) => void;
  removeRouteWaypoint: (id: string) => void;
  moveRouteWaypoint: (id: string, direction: 'up' | 'down') => void;
  updateRouteWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  clearRoute: () => void;
  setActiveAircraft: (aircraft: AircraftProfile) => void;
  updateActiveAircraft: (updates: Partial<AircraftProfile>) => void;
  updatePersonalMinimums: (updates: Partial<PersonalMinimums>) => void;
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

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      // Default viewport - South Africa
      center: [28.0, -26.0],
      zoom: 7,
      
      // No feature selected initially
      selectedFeature: null,
      
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
      personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
      
      // Actions
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setViewport: (center, zoom) => set({ center, zoom }),
      
      setSelectedFeature: (feature) => set({ 
        selectedFeature: feature,
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
        sidebarPanel: 'route',
        sidebarOpen: true,
      })),

      addUserWaypoint: (coordinates) => set((state) => ({
        waypoints: [
          ...state.waypoints,
          createUserWaypoint(coordinates, state.waypoints.length + 1),
        ],
        selectedFeature: null,
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

      clearRoute: () => set({ waypoints: [] }),

      setActiveAircraft: (aircraft) => set({
        activeAircraft: clampAircraftProfile(aircraft),
      }),

      updateActiveAircraft: (updates) => set((state) => ({
        activeAircraft: clampAircraftProfile({ ...state.activeAircraft, ...updates }),
      })),

      updatePersonalMinimums: (updates) => set((state) => ({
        personalMinimums: clampPersonalMinimums({ ...state.personalMinimums, ...updates }),
      })),
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
        personalMinimums: state.personalMinimums,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MapState> | undefined;

        return {
          ...current,
          ...persistedState,
          visibleLayers: {
            ...DEFAULT_VISIBLE_LAYERS,
            ...persistedState?.visibleLayers,
          },
        };
      },
    }
  )
);
