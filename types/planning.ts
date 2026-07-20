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
  compassDeviationDeg?: number;
  glideRatio?: number;
  weightBalance?: WeightBalanceConfig;
}

export type WeightBalanceStatus =
  | 'unconfigured'
  | 'incomplete'
  | 'within-limits'
  | 'caution'
  | 'out-of-limits';

export interface WeightBalanceFuelConfig {
  armIn?: number;
  weightPerGalLb: number;
  taxiFuelGal?: number;
}

export interface WeightBalanceStation {
  id: string;
  name: string;
  armIn?: number;
  maxWeightLb?: number;
}

export interface WeightBalanceEnvelopePoint {
  weightLb: number;
  forwardArmIn: number;
  aftArmIn: number;
}

export interface WeightBalanceConfig {
  units: 'imperial';
  setupStatus: 'needs-poh' | 'configured';
  emptyWeightLb?: number;
  emptyArmIn?: number;
  maxRampWeightLb?: number;
  maxTakeoffWeightLb?: number;
  maxLandingWeightLb?: number;
  fuel: WeightBalanceFuelConfig;
  stations: WeightBalanceStation[];
  envelope: WeightBalanceEnvelopePoint[];
}

export interface WeightBalanceLoading {
  fuelGal: number;
  landingFuelGal?: number;
  stationWeights: Record<string, number>;
}

export interface WeightBalanceStateResult {
  label: 'ramp' | 'takeoff' | 'landing';
  weightLb: number;
  armIn: number;
  momentLbIn: number;
  forwardLimitIn?: number;
  aftLimitIn?: number;
  maxWeightLb?: number;
  withinEnvelope: boolean;
  withinWeight: boolean;
  marginIn?: number;
  marginWeightLb?: number;
}

export interface WeightBalanceResult {
  status: WeightBalanceStatus;
  message: string;
  ramp?: WeightBalanceStateResult;
  takeoff?: WeightBalanceStateResult;
  landing?: WeightBalanceStateResult;
  issues: string[];
  calculatedAt?: string;
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

export interface TrainingWind {
  directionDeg: number;
  speedKts: number;
}

export interface TrainingNavLogLeg {
  id: string;
  from: string;
  to: string;
  trueCourseDeg: number;
  magneticCourseDeg: number;
  windCorrectionAngleDeg: number;
  trueHeadingDeg: number;
  magneticHeadingDeg: number;
  compassHeadingDeg: number;
  groundSpeedKts: number;
  estimatedTimeMinutes: number;
  fuelRequiredGal: number;
  formula: string;
}

export interface TrainingNavLog {
  wind: TrainingWind;
  legs: TrainingNavLogLeg[];
  totalTimeMinutes: number;
  totalFuelGal: number;
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

export type BriefingDigestStatus = 'ready' | 'review' | 'stop';

export interface BriefingDigestItem {
  id: string;
  level: 'info' | 'caution' | 'critical';
  title: string;
  action: string;
  source: string;
}

export interface BriefingDigest {
  status: BriefingDigestStatus;
  title: string;
  summary: string;
  items: BriefingDigestItem[];
  generatedAt: string;
}

export type DataFreshnessStatus = 'current' | 'stale' | 'unknown';

export interface DataFreshness {
  source: string;
  status: DataFreshnessStatus;
  label: string;
  updatedAt?: string;
  ageMinutes?: number;
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
  | 'manual-required'
  | 'unavailable'
  | 'partial'
  | 'complete';

export interface RouteNotamReview {
  source: 'south-africa-official' | 'faa-notam-api' | 'unavailable';
  status: RouteNotamReviewStatus;
  message: string;
  notams: RouteNotam[];
  locations: string[];
  queryCount: number;
  sourceUrl: string;
  updatedAt?: string;
}

export type NotamBriefingRecordStatus =
  | 'not-recorded'
  | 'completed'
  | 'not-applicable'
  | 'needs-rebrief';

export interface NotamBriefingRecord {
  status: NotamBriefingRecordStatus;
  method?: string;
  sourceUrl?: string;
  reference?: string;
  completedAt?: string;
  notes?: string;
  routeSignature?: string;
  departureTime?: string;
}

export type FlightPlanFilingStatus =
  | 'not-filing'
  | 'preparing'
  | 'filed-manually'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export interface FlightPlanFilingRecord {
  status: FlightPlanFilingStatus;
  method?: string;
  reference?: string;
  filedAt?: string;
  acceptedAt?: string;
  closedAt?: string;
  responsibleContact?: string;
  notes?: string;
}

export interface FlightAdminReview {
  status: BriefingDigestStatus;
  message: string;
  officialSourceUrl: string;
  notamRecord: NotamBriefingRecord;
  notamStatus: NotamBriefingRecordStatus;
  notamRecordStale: boolean;
  notamMessage: string;
  flightPlanRecord: FlightPlanFilingRecord;
  filingStatus: FlightPlanFilingStatus;
  filingMessage: string;
  routePibRequestText: string;
  routeSignature: string;
  updatedAt: string;
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
  startDistanceNm?: number;
  endDistanceNm?: number;
}

export interface AirspaceVerticalProfileItem {
  id: string;
  name: string;
  level: RouteAirspaceAlertLevel;
  lowerLimit?: string;
  upperLimit?: string;
  lowerLimitFt?: number;
  upperLimitFt?: number;
  cruiseAltitudeFt: number;
  conflict: boolean;
  requiresReview: boolean;
  startDistanceNm?: number;
  endDistanceNm?: number;
}

export interface AirspaceVerticalProfile {
  routeDistanceNm: number;
  cruiseAltitudeFt: number;
  status: 'clear' | 'review' | 'critical';
  items: AirspaceVerticalProfileItem[];
}

export interface FilingChecklistState {
  routeReviewed: boolean;
  weatherReviewed: boolean;
  notamPibObtained: boolean;
  weightBalanceReviewed: boolean;
  fuelReviewed: boolean;
  filedViaOfficialSource: boolean;
}

export interface FlightCloseReminder {
  enabled: boolean;
  plannedDepartureTime?: string;
  plannedArrivalTime?: string;
  closeByTime?: string;
  acknowledgedAt?: string;
}

export type FilingReminderStatus =
  | 'not-planned'
  | 'planned'
  | 'due-soon'
  | 'overdue'
  | 'closed';

export interface FilingWorkflowReview {
  status: FilingReminderStatus;
  checklistComplete: boolean;
  checklistItemsComplete: number;
  checklistItemsTotal: number;
  message: string;
  officialSourceUrl: string;
  plannedDepartureTime?: string;
  plannedArrivalTime?: string;
  closeByTime?: string;
  minutesUntilClose?: number;
}

export type EmergencyLandingSuitability = 'good' | 'caution' | 'unknown' | 'unsuitable';

export interface EmergencyLandingSite {
  id: string;
  name: string;
  coordinates: Coordinates;
  suitability: EmergencyLandingSuitability;
  notes?: string;
  lastVerifiedDate?: string;
}

export interface EmergencyAerodromeCandidate {
  id: string;
  name: string;
  ident?: string;
  coordinates: Coordinates;
  elevationFt?: number;
  source: 'route-waypoint' | 'starter-data' | 'user-site';
  suitability: EmergencyLandingSuitability;
  distanceFromRouteNm: number;
  score: number;
}

export interface EmergencyPlanningReview {
  status: 'needs-route' | 'available' | 'review';
  message: string;
  cruiseAltitudeFt: number;
  glideRatio: number;
  glideRadiusNm: number;
  candidates: EmergencyAerodromeCandidate[];
  userSites: EmergencyLandingSite[];
  updatedAt: string;
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
