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

export type NotamSeverity = 'info' | 'caution' | 'critical';

export type NotamCategory =
  | 'runway'
  | 'approach'
  | 'navaid'
  | 'airspace'
  | 'taxiway'
  | 'lighting'
  | 'obstacle'
  | 'services'
  | 'wildlife'
  | 'other';

export interface RouteNotam {
  id: string;
  location: string;
  type?: string;
  category: NotamCategory;
  severity: NotamSeverity;
  text: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  source: string;
  sourceUrl: string;
  appliesToRoute: boolean;
}

export type RouteNotamReviewStatus =
  | 'needs-route'
  | 'checking'
  | 'unavailable'
  | 'partial'
  | 'complete';

export interface RouteNotamReview {
  source: 'faa-notam-api' | 'unavailable';
  status: RouteNotamReviewStatus;
  message: string;
  notams: RouteNotam[];
  locations: string[];
  queryCount: number;
  sourceUrl: string;
  updatedAt?: string;
}

export type RouteAirspaceAlertLevel = 'info' | 'caution' | 'critical';

export interface RouteAirspaceAlert {
  id: string;
  name: string;
  sourceId?: string;
  airspaceType?: string;
  airspaceClass?: string;
  lowerLimit?: string;
  upperLimit?: string;
  lowerLimitFt?: number;
  upperLimitFt?: number;
  cruiseAltitudeFt: number;
  conflict: boolean;
  requiresReview: boolean;
  level: RouteAirspaceAlertLevel;
  reason: string;
  relationship?: 'crossing' | 'corridor';
  distanceNm?: number;
}

export type RouteAirspaceReviewSource = 'rendered-vector' | 'openaip-core';

export type RouteAirspaceReviewStatus =
  | 'needs-route'
  | 'map-loading'
  | 'airspace-hidden'
  | 'checking'
  | 'unavailable'
  | 'rate-limited'
  | 'partial'
  | 'complete';

export interface RouteAirspaceReview {
  source: RouteAirspaceReviewSource;
  status: RouteAirspaceReviewStatus;
  message: string;
  alerts: RouteAirspaceAlert[];
  sampledPointCount: number;
  visibleLayerCount: number;
  corridorNm?: number;
  queryCount?: number;
  candidateCount?: number;
  routeSignature?: string;
  updatedAt?: string;
}

export interface CompetitorPainPoint {
  competitor: string;
  painPoint: string;
  evidence: string;
  haloResponse: string;
  sourceUrl: string;
}
