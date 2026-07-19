export type Coordinates = [number, number];

export type WaypointType = 'airport' | 'navaid' | 'user' | 'reporting-point';

export interface Waypoint {
  id: string;
  type: WaypointType;
  name: string;
  ident?: string;
  coordinates: Coordinates;
  elevationFt?: number;
  sourceId?: string;
  notes?: string;
}

export interface AircraftProfile {
  id: string;
  registration: string;
  type: string;
  name: string;
  cruiseSpeedKts: number;
  fuelBurnGph: number;
  usableFuelGal: number;
  reserveMinutes: number;
  contingencyPercent: number;
  magneticVariationDeg: number;
}

export interface PersonalMinimums {
  minimumCeilingFt: number;
  minimumVisibilitySm: number;
  minimumFuelReserveMinutes: number;
  maxSurfaceWindKts: number;
  maxCrosswindKts: number;
}

export interface RouteLeg {
  id: string;
  from: Waypoint;
  to: Waypoint;
  distanceNm: number;
  trueCourseDeg: number;
  magneticCourseDeg: number;
  estimatedTimeMinutes: number;
  fuelRequiredGal: number;
}

export interface RouteSummary {
  waypointCount: number;
  legCount: number;
  totalDistanceNm: number;
  estimatedTimeMinutes: number;
  tripFuelGal: number;
  reserveFuelGal: number;
  contingencyFuelGal: number;
  totalFuelRequiredGal: number;
  usableFuelGal: number;
  fuelRemainingGal: number;
  fuelStatus: 'ok' | 'caution' | 'critical';
}

export interface RouteAnalysis {
  legs: RouteLeg[];
  summary: RouteSummary;
}

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN';

export interface DecodedWind {
  directionDeg: number | null;
  speedKts: number;
  gustKts?: number;
  variable: boolean;
}

export interface CloudLayer {
  cover: string;
  baseFt?: number;
}

export interface WeatherReport {
  icao: string;
  raw: string;
  observedAt?: string;
  wind?: DecodedWind;
  visibilitySm?: number;
  ceilingFt?: number;
  clouds: CloudLayer[];
  temperatureC?: number;
  dewpointC?: number;
  altimeterHpa?: number;
  flightCategory: FlightCategory;
}

export interface BriefingRisk {
  id: string;
  level: 'ok' | 'caution' | 'critical';
  title: string;
  detail: string;
}

export interface CompetitorPainPoint {
  competitor: string;
  painPoint: string;
  evidence: string;
  haloResponse: string;
  sourceUrl: string;
}
