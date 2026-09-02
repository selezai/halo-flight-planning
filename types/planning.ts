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
  performanceProfileId?: string;
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

export type FuelQuantityUnit = 'usg' | 'litre' | 'kg' | 'lb';

export interface FuelQuantity {
  value: number;
  unit: FuelQuantityUnit;
}

export type FixedWingAircraftClass = 'piston' | 'turboprop' | 'jet';

export type AircraftPerformanceProfileStatus = 'draft' | 'approved' | 'archived';

export interface AircraftPerformanceSource {
  title: string;
  revision?: string;
  page?: string;
  effectiveDate?: string;
  notes?: string;
}

export type PerformancePhase = 'taxi' | 'climb' | 'cruise' | 'descent' | 'holding';

export type PerformanceInputKey =
  | 'weightLb'
  | 'altitudeFt'
  | 'temperatureC'
  | 'isaDeviationC'
  | 'powerPercent'
  | 'rpm'
  | 'torquePercent'
  | 'manifoldPressureInHg'
  | 'timeMinutes';

export interface PerformanceConditions extends Partial<Record<PerformanceInputKey, number>> {
  powerSetting?: string;
  mixtureSetting?: string;
}

export interface PerformanceTableOutput {
  fuel?: FuelQuantity;
  fuelFlowPerHour?: FuelQuantity;
  timeMinutes?: number;
  distanceNm?: number;
  trueAirspeedKts?: number;
}

export interface PerformanceTableRow {
  id?: string;
  conditions: PerformanceConditions;
  output: PerformanceTableOutput;
  notes?: string;
}

export interface PerformanceTable {
  id: string;
  phase: PerformancePhase;
  title: string;
  interpolationKeys: PerformanceInputKey[];
  rows: PerformanceTableRow[];
  sourceRef?: string;
}

export interface AircraftPerformanceProfile {
  id: string;
  ownerId?: string;
  registration: string;
  aircraftType: string;
  displayName: string;
  aircraftClass: FixedWingAircraftClass;
  status: AircraftPerformanceProfileStatus;
  source: AircraftPerformanceSource;
  fuelUnit: FuelQuantityUnit;
  displayFuelUnit: FuelQuantityUnit;
  fuelDensityLbPerUsg: number;
  usableFuel: FuelQuantity;
  defaultTaxiFuel?: FuelQuantity;
  contingencyPercent: number;
  finalReserveMinutes: number;
  defaultHoldingMinutes: number;
  tables: PerformanceTable[];
  approvalNotes?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface WeightBalanceLoadTemplate {
  id: string;
  name: string;
  aircraftId?: string;
  performanceProfileId?: string;
  fuelGal: number;
  landingFuelGal?: number;
  stationWeights: Record<string, number>;
  lockedStationWeights: Record<string, number>;
  createdAt: string;
  updatedAt: string;
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

export type ActiveRouteStatus = 'idle' | 'active' | 'stopped';

export interface ActiveRouteState {
  status: ActiveRouteStatus;
  startedAt?: string;
  stoppedAt?: string;
  currentLegIndex: number;
  nextWaypointId?: string;
  distanceToNextNm?: number;
  crossTrackErrorNm?: number;
  lastPositionAt?: string;
}

export type LocationTrackingStatus =
  | 'idle'
  | 'requesting'
  | 'tracking'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface TrackedLocation {
  coordinates: Coordinates;
  accuracyM?: number;
  altitudeFt?: number;
  altitudeAccuracyFt?: number;
  headingDeg?: number;
  speedKts?: number;
  timestamp: string;
}

export interface LocationTrackingState {
  enabled: boolean;
  followMode: boolean;
  status: LocationTrackingStatus;
  position?: TrackedLocation;
  error?: string;
  lastUpdatedAt?: string;
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

export type FlightRules = 'vfr' | 'ifr';

export type FuelPlanningRuleSet = 'sacaa-atns-ga';

export type FuelPolicyMode = 'required' | 'target-landing' | 'max-wb-constrained';

export interface RouteWindInput {
  source: 'manual' | 'provider';
  directionDeg: number;
  speedKts: number;
  label?: string;
  updatedAt?: string;
}

export interface AlternateFuelInput {
  name: string;
  distanceNm: number;
  cruiseAltitudeFt?: number;
  wind?: RouteWindInput;
}

export interface FuelPlanningState {
  flightRules: FlightRules;
  ruleSet: FuelPlanningRuleSet;
  selectedPerformanceProfileId?: string;
  wind: RouteWindInput;
  temperatureC: number;
  takeoffWeightLb: number;
  cruisePowerSetting?: string;
  mixtureSetting?: string;
  holdingMinutes: number;
  finalReserveMinutes: number;
  contingencyPercent: number;
  fuelPolicyMode?: FuelPolicyMode;
  targetLandingFuel?: FuelQuantity;
  alternate?: AlternateFuelInput;
  additionalFuel: FuelQuantity;
  discretionaryFuel: FuelQuantity;
}

export type FuelPlanningResultStatus =
  | 'needs-route'
  | 'untrusted-profile'
  | 'incomplete-profile'
  | 'ready'
  | 'caution'
  | 'critical';

export type FuelBreakdownKind =
  | 'taxi'
  | 'climb'
  | 'cruise'
  | 'descent'
  | 'trip'
  | 'contingency'
  | 'alternate'
  | 'holding'
  | 'final-reserve'
  | 'additional'
  | 'discretionary'
  | 'total-required'
  | 'remaining'
  | 'expected-landing';

export interface FuelBreakdownItem {
  kind: FuelBreakdownKind;
  label: string;
  quantity: FuelQuantity;
  trusted: boolean;
  detail: string;
}

export interface FuelPlanLeg {
  id: string;
  from: string;
  to: string;
  distanceNm: number;
  trueCourseDeg: number;
  windCorrectionAngleDeg: number;
  groundSpeedKts: number;
  estimatedTimeMinutes: number;
  fuel: FuelQuantity;
}

export interface FuelPolicyReview {
  mode: FuelPolicyMode;
  status: FuelPlanningResultStatus;
  trusted: boolean;
  message: string;
  targetLandingFuel?: FuelQuantity;
  maxWbConstrainedFuel?: FuelQuantity;
  usableFuel?: FuelQuantity;
  reserveMargin?: FuelQuantity;
}

export interface FuelPlanningResult {
  status: FuelPlanningResultStatus;
  ruleSet: FuelPlanningRuleSet;
  profileId?: string;
  profileStatus?: AircraftPerformanceProfileStatus;
  trusted: boolean;
  message: string;
  issues: string[];
  breakdown: FuelBreakdownItem[];
  legs: FuelPlanLeg[];
  tripFuel: FuelQuantity;
  totalRequiredFuel: FuelQuantity;
  usableFuel: FuelQuantity;
  remainingFuel: FuelQuantity;
  expectedLandingFuel: FuelQuantity;
  policy?: FuelPolicyReview;
  calculatedAt: string;
}

export type RouteTokenKind =
  | 'waypoint'
  | 'coordinate'
  | 'airway'
  | 'procedure'
  | 'altitude'
  | 'direct';

export interface RouteToken {
  kind: RouteTokenKind;
  source: string;
  query?: string;
  coordinates?: Coordinates;
  altitudeFt?: number;
  requiresProvider: boolean;
}

export type RouteCandidateSource = 'direct' | 'current' | 'licensed-provider';

export type RouteCandidateStatus =
  | 'available'
  | 'needs-route'
  | 'provider-not-configured'
  | 'unavailable';

export interface RouteCandidate {
  id: string;
  title: string;
  source: RouteCandidateSource;
  status: RouteCandidateStatus;
  message: string;
  waypoints: Waypoint[];
  totalDistanceNm?: number;
  estimatedTimeMinutes?: number;
  totalFuelRequired?: FuelQuantity;
  remainingFuel?: FuelQuantity;
  warnings: string[];
}

export type RouteIntelligenceReviewStatus =
  | 'needs-route'
  | 'ready'
  | 'provider-not-configured'
  | 'unavailable';

export interface RouteIntelligenceReview {
  status: RouteIntelligenceReviewStatus;
  message: string;
  tokens: RouteToken[];
  candidates: RouteCandidate[];
  providerConfigured: boolean;
  selectedCandidateId?: string;
  sourceUrl?: string;
  updatedAt: string;
}

export type WeatherProviderStatus =
  | 'manual'
  | 'configured'
  | 'provider-not-configured'
  | 'unavailable';

export type RouteWeatherReviewStatus =
  | 'needs-route'
  | 'current'
  | 'partial'
  | 'manual-wind'
  | 'provider-not-configured'
  | 'unavailable';

export interface RouteWeatherStationReview {
  icao: string;
  hasMetar: boolean;
  hasTaf: boolean;
  message: string;
  updatedAt?: string;
}

export interface RouteWeatherReview {
  status: RouteWeatherReviewStatus;
  message: string;
  stations: RouteWeatherStationReview[];
  metarCount: number;
  tafCount: number;
  windStatus: WeatherProviderStatus;
  windsAloftStatus: WeatherProviderStatus;
  wind?: RouteWindInput;
  sourceUrl?: string;
  updatedAt: string;
}

export type GridMoraReviewSource =
  | 'south-africa-official'
  | 'jeppesen'
  | 'lido'
  | 'navblue'
  | 'unavailable';

export type GridMoraReviewStatus =
  | 'needs-route'
  | 'provider-not-configured'
  | 'checking'
  | 'unavailable'
  | 'stale'
  | 'partial'
  | 'complete';

export interface GridMoraCell {
  id: string;
  label: string;
  bounds: [Coordinates, Coordinates];
  moraFt: number;
  accuracy: 'normal' | 'doubtful';
  source: GridMoraReviewSource;
}

export interface GridMoraReview {
  source: GridMoraReviewSource;
  status: GridMoraReviewStatus;
  message: string;
  cells: GridMoraCell[];
  routeSignature?: string;
  sourceUrl?: string;
  updatedAt?: string;
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

export type RouteAirfieldBriefStatus =
  | 'needs-route'
  | 'available'
  | 'partial'
  | 'missing-official-data';

export interface RouteAirfieldBriefFrequency {
  type: string;
  value: string;
  name?: string;
  primary?: boolean;
  source: 'openaip' | 'official-required';
}

export interface RouteAirfieldBriefRunway {
  designator: string;
  length?: number;
  width?: number;
  surface?: string;
  unit?: string;
}

export interface RouteAirfieldBriefAirport {
  ident?: string;
  name: string;
  sourceId?: string;
  coordinates: Coordinates;
  elevationFt?: number;
  frequencies: RouteAirfieldBriefFrequency[];
  runways: RouteAirfieldBriefRunway[];
  missing: string[];
  message: string;
}

export interface RouteAirfieldBrief {
  status: RouteAirfieldBriefStatus;
  message: string;
  airports: RouteAirfieldBriefAirport[];
  source: 'openaip' | 'official-required';
  sourceUrl?: string;
  updatedAt: string;
}

export interface DispatchBriefingSection {
  id: string;
  title: string;
  status: BriefingDigestStatus;
  lines: string[];
}

export interface DispatchBriefingPackage {
  id: string;
  title: string;
  generatedAt: string;
  routeName: string;
  sections: DispatchBriefingSection[];
  officialHandoff: {
    required: boolean;
    sources: string[];
    message: string;
  };
  dataFreshness: DataFreshness[];
}

export type HaloMissionStatus = 'draft' | 'needs-review' | 'ready' | 'flown' | 'archived';

export interface HaloMissionPlannerState {
  center: Coordinates;
  zoom: number;
  routeName: string;
  routeNotes: string;
  departureTime: string;
  cruiseAltitudeFt: number;
  waypoints: Waypoint[];
  activeAircraft: AircraftProfile;
  selectedAircraftPerformanceProfileId?: string;
  fuelPlanning: FuelPlanningState;
  gridMoraReview: GridMoraReview;
  weightBalanceLoading: WeightBalanceLoading;
  weightBalanceLoadTemplates: WeightBalanceLoadTemplate[];
  selectedRouteCandidateId?: string;
  trainingWind: TrainingWind;
  filingChecklist: FilingChecklistState;
  notamBriefingRecord: NotamBriefingRecord;
  flightPlanFilingRecord: FlightPlanFilingRecord;
  closeReminder: FlightCloseReminder;
  emergencyLandingSites: EmergencyLandingSite[];
  personalMinimums: PersonalMinimums;
}

export interface HaloMissionRecord {
  id: string;
  name: string;
  status: HaloMissionStatus;
  routeLabel: string;
  aircraftLabel: string;
  waypointCount: number;
  createdAt: string;
  updatedAt: string;
  flownAt?: string;
  archivedAt?: string;
  state: HaloMissionPlannerState;
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
