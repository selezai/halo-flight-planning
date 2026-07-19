import { z } from 'zod';
import type { AircraftProfile, PersonalMinimums, Waypoint } from '@/types/planning';

export const visibleLayersSchema = z.object({
  airports: z.boolean(),
  navaids: z.boolean(),
  airspaces: z.boolean(),
  reportingPoints: z.boolean(),
  obstacles: z.boolean(),
  hotspots: z.boolean(),
  hangGlidings: z.boolean(),
  rcAirfields: z.boolean(),
});

const waypointSchema = z.object({
  id: z.string().min(1).max(160),
  type: z.enum(['airport', 'navaid', 'user', 'reporting-point']),
  name: z.string().min(1).max(240),
  ident: z.string().trim().min(1).max(12).optional(),
  coordinates: z.tuple([
    z.number().finite().gte(-180).lte(180),
    z.number().finite().gte(-90).lte(90),
  ]),
  elevationFt: z.number().finite().optional(),
  sourceId: z.string().max(160).optional(),
  notes: z.string().max(1000).optional(),
});

const weightBalanceStationSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  armIn: z.number().finite().gte(0).lte(1000),
  maxWeightLb: z.number().finite().gte(0).lte(10000).optional(),
});

const weightBalanceEnvelopePointSchema = z.object({
  weightLb: z.number().finite().gte(0).lte(100000),
  forwardArmIn: z.number().finite().gte(0).lte(1000),
  aftArmIn: z.number().finite().gte(0).lte(1000),
});

const weightBalanceConfigSchema = z.object({
  emptyWeightLb: z.number().finite().gte(0).lte(100000),
  emptyArmIn: z.number().finite().gte(0).lte(1000),
  maxRampWeightLb: z.number().finite().gte(0).lte(100000).optional(),
  maxTakeoffWeightLb: z.number().finite().gte(0).lte(100000),
  maxLandingWeightLb: z.number().finite().gte(0).lte(100000).optional(),
  fuelArmIn: z.number().finite().gte(0).lte(1000),
  fuelWeightLbPerGal: z.number().finite().gte(0).lte(100),
  stations: z.array(weightBalanceStationSchema).max(32),
  envelope: z.array(weightBalanceEnvelopePointSchema).max(64),
  notes: z.string().max(2000).optional(),
});

const weightBalanceLoadingSchema = z.object({
  fuelGallons: z.number().finite().gte(0).lte(1000),
  taxiFuelGallons: z.number().finite().gte(0).lte(1000),
  stationWeightsLb: z.record(z.string().min(1).max(80), z.number().finite().gte(0).lte(10000)),
});

export const aircraftProfileSchema = z.object({
  id: z.string().min(1).max(120),
  registration: z.string().min(1).max(80),
  type: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  cruiseSpeedKts: z.number().finite().gte(1).lte(1000),
  fuelBurnGph: z.number().finite().gte(0).lte(1000),
  usableFuelGal: z.number().finite().gte(0).lte(10000),
  reserveMinutes: z.number().finite().gte(0).lte(1440),
  contingencyPercent: z.number().finite().gte(0).lte(100),
  magneticVariationDeg: z.number().finite().gte(-180).lte(180),
  weightBalance: weightBalanceConfigSchema.optional(),
  weightBalanceLoading: weightBalanceLoadingSchema.optional(),
});

export const personalMinimumsSchema = z.object({
  minimumCeilingFt: z.number().finite().gte(0).lte(60000),
  minimumVisibilitySm: z.number().finite().gte(0).lte(100),
  minimumFuelReserveMinutes: z.number().finite().gte(0).lte(1440),
  maxSurfaceWindKts: z.number().finite().gte(0).lte(300),
  maxCrosswindKts: z.number().finite().gte(0).lte(300),
});

export const accountSnapshotSchema = z.object({
  route: z.object({
    routeId: z.literal('primary').default('primary'),
    name: z.string().min(1).max(160),
    notes: z.string().max(5000),
    departureTime: z.string().max(80),
    cruiseAltitudeFt: z.number().finite().gte(0).lte(60000),
    waypoints: z.array(waypointSchema).max(100),
  }),
  aircraft: aircraftProfileSchema,
  personalMinimums: personalMinimumsSchema,
  visibleLayers: visibleLayersSchema,
  updatedAt: z.string().datetime().optional(),
});

export const accountSnapshotRequestSchema = z.object({
  snapshot: accountSnapshotSchema,
});

export type VisibleLayersSnapshot = z.infer<typeof visibleLayersSchema>;
export type HaloAccountSnapshot = z.infer<typeof accountSnapshotSchema>;

export interface PlannerStateForAccountSnapshot {
  routeName: string;
  routeNotes: string;
  departureTime: string;
  cruiseAltitudeFt: number;
  waypoints: Waypoint[];
  activeAircraft: AircraftProfile;
  personalMinimums: PersonalMinimums;
  visibleLayers: VisibleLayersSnapshot;
}

export function createAccountSnapshot(state: PlannerStateForAccountSnapshot): HaloAccountSnapshot {
  return accountSnapshotSchema.parse({
    route: {
      routeId: 'primary',
      name: state.routeName || 'Untitled route',
      notes: state.routeNotes,
      departureTime: state.departureTime,
      cruiseAltitudeFt: state.cruiseAltitudeFt,
      waypoints: state.waypoints,
    },
    aircraft: state.activeAircraft,
    personalMinimums: state.personalMinimums,
    visibleLayers: state.visibleLayers,
    updatedAt: new Date().toISOString(),
  });
}

export function mergeAccountSnapshotIntoPlannerState(snapshot: HaloAccountSnapshot) {
  return {
    routeName: snapshot.route.name,
    routeNotes: snapshot.route.notes,
    departureTime: snapshot.route.departureTime,
    cruiseAltitudeFt: snapshot.route.cruiseAltitudeFt,
    waypoints: snapshot.route.waypoints,
    activeAircraft: snapshot.aircraft,
    personalMinimums: snapshot.personalMinimums,
    visibleLayers: snapshot.visibleLayers,
  };
}
