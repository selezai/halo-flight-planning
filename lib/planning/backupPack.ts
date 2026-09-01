import type {
  AircraftProfile,
  AirspaceVerticalProfile,
  AirspaceVerticalProfileItem,
  BriefingDigest,
  BriefingRisk,
  DataFreshness,
  EmergencyPlanningReview,
  FlightAdminReview,
  FilingWorkflowReview,
  FuelPlanningResult,
  GridMoraReview,
  RouteAirspaceAlert,
  RouteAnalysis,
  RouteNotamReview,
  TrainingNavLog,
  WeightBalanceResult,
  WeightBalanceStateResult,
  Waypoint,
  WeatherReport,
} from '@/types/planning';
import { formatCoordinates, formatCourse, formatDistance, formatDuration, formatFuel } from './navigation';
import { formatEmergencyPlanningLines } from './emergencyPlanning';
import { formatFilingWorkflowLines } from './filingReminder';
import { formatFlightAdminLines } from './flightAdmin';
import { formatFuelQuantity } from './fuel';
import { formatGridMoraReviewLines } from './gridMora';
import { getWeightBalanceStatusLabel } from './weightBalance';

export interface BackupPackParams {
  routeName: string;
  aircraft: AircraftProfile;
  route: RouteAnalysis;
  waypoints: Waypoint[];
  digest: BriefingDigest;
  weather: WeatherReport[];
  risks: BriefingRisk[];
  routeAirspaceAlerts?: RouteAirspaceAlert[];
  airspaceVerticalProfile?: AirspaceVerticalProfile;
  routeNotamReview?: RouteNotamReview;
  weightBalanceResult?: WeightBalanceResult;
  dataFreshness?: DataFreshness[];
  trainingNavLog?: TrainingNavLog;
  fuelPlanningResult?: FuelPlanningResult;
  gridMoraReview?: GridMoraReview;
  filingReview?: FilingWorkflowReview;
  flightAdminReview?: FlightAdminReview;
  emergencyReview?: EmergencyPlanningReview;
  departureTime?: string;
  cruiseAltitudeFt?: number;
  notes?: string;
}

export function buildBackupPackText(params: BackupPackParams): string {
  const {
    routeName,
    aircraft,
    route,
    waypoints,
    digest,
    weather,
    risks,
    routeAirspaceAlerts = [],
    airspaceVerticalProfile,
    routeNotamReview,
    weightBalanceResult,
    dataFreshness = [],
    trainingNavLog,
    fuelPlanningResult,
    gridMoraReview,
    filingReview,
    flightAdminReview,
    emergencyReview,
    departureTime,
    cruiseAltitudeFt,
    notes,
  } = params;

  return [
    'HALO BACKUP / PRINT PACK',
    `Generated: ${new Date().toISOString()}`,
    '',
    'PILOT DIGEST',
    `Status: ${digest.status.toUpperCase()} - ${digest.title}`,
    digest.summary,
    ...digest.items.map((item, index) =>
      `${index + 1}. ${item.level.toUpperCase()}: ${item.title} [${item.source}] - ${item.action}`
    ),
    '',
    'DATA FRESHNESS WARNINGS',
    ...formatFreshnessWarnings(dataFreshness),
    '',
    'DISPATCH SNAPSHOT',
    `Route: ${routeName || routeLabel(waypoints)}`,
    `Aircraft: ${aircraft.registration} ${aircraft.type} (${aircraft.name})`,
    `Departure time: ${departureTime || 'Not set'}`,
    `Cruise altitude: ${cruiseAltitudeFt ? `${Math.round(cruiseAltitudeFt)} ft` : 'Not set'}`,
    `Distance: ${formatDistance(route.summary.totalDistanceNm)}`,
    `ETE: ${formatDuration(route.summary.estimatedTimeMinutes)}`,
    '',
    'WAYPOINTS',
    ...formatWaypoints(waypoints),
    '',
    'NAVLOG',
    ...formatOperationalNavLog(route),
    '',
    'TRAINING / CHECKRIDE NAVLOG',
    ...formatTrainingNavLog(trainingNavLog),
    '',
    'FUEL',
    ...formatFuelPlanning(fuelPlanningResult, route),
    '',
    'WEIGHT & BALANCE',
    ...formatWeightBalance(weightBalanceResult),
    '',
    'WEATHER',
    ...formatWeather(weather),
    '',
    'AIRSPACE',
    ...formatAirspace(routeAirspaceAlerts),
    '',
    'AIRSPACE VERTICAL PROFILE',
    ...formatAirspaceVerticalProfile(airspaceVerticalProfile),
    '',
    'GRID MORA',
    ...formatGridMoraReviewLines(gridMoraReview),
    '',
    'NOTAM',
    ...formatNotam(routeNotamReview),
    '',
    'FLIGHT ADMIN WORKSHEET',
    ...formatFlightAdminLines(flightAdminReview, filingReview),
    '',
    'RISK REVIEW',
    ...risks.map((risk) => `${risk.level.toUpperCase()}: ${risk.title} - ${risk.detail}`),
    '',
    'FILING & CLOSE REMINDER WORKSHEET',
    ...formatFilingWorkflowLines(filingReview),
    'File2Fly / official handoff complete: ______',
    'Filed route matches Halo route: ______',
    'Responsible person / contact: ______',
    '',
    'EMERGENCY / FORCED-LANDING WORKSHEET',
    ...formatEmergencyPlanningLines(emergencyReview),
    `Aircraft glide ratio: ${aircraft.glideRatio ?? 'Not set'}:1`,
    `Cruise altitude for glide planning: ${cruiseAltitudeFt ? `${Math.round(cruiseAltitudeFt)} ft` : 'Not set'}`,
    'Nearest suitable aerodrome / field 1: ______',
    'Nearest suitable aerodrome / field 2: ______',
    'Forced-landing notes: ______',
    '',
    'OFFICIAL SOURCE LINKS',
    `NOTAM source: ${routeNotamReview?.sourceUrl ?? 'Official source not configured in Halo'}`,
    `Grid MORA source: ${gridMoraReview?.sourceUrl ?? 'Licensed provider not configured in Halo'}`,
    'Weather source: https://aviationweather.gov/',
    'South Africa official filing/briefing: https://file2fly.atns.co.za/aes/login.jsp',
    'OpenAIP aviation data: https://www.openaip.net/',
    '',
    'PILOT NOTES',
    notes || 'No pilot notes entered.',
  ].join('\n');
}

function formatFreshnessWarnings(dataFreshness: DataFreshness[]): string[] {
  if (dataFreshness.length === 0) {
    return ['Freshness metadata unavailable. Re-check every official source before flight.'];
  }

  const warnings = dataFreshness.filter((item) => item.status !== 'current');
  if (warnings.length === 0) {
    return ['All tracked Halo data sources are current by configured thresholds. Continue official preflight review.'];
  }

  return warnings.map((item) =>
    `${item.status.toUpperCase()}: ${item.label}${item.updatedAt ? `, updated ${item.updatedAt}` : ''}`
  );
}

function formatWaypoints(waypoints: Waypoint[]): string[] {
  if (waypoints.length === 0) return ['No waypoints entered.'];

  return waypoints.map((waypoint, index) =>
    `${index + 1}. ${waypoint.ident ?? waypoint.name} - ${formatCoordinates(waypoint.coordinates)}${waypoint.elevationFt ? `, elevation ${Math.round(waypoint.elevationFt)} ft` : ''}`
  );
}

function formatOperationalNavLog(route: RouteAnalysis): string[] {
  if (route.legs.length === 0) {
    return ['No navlog legs available.'];
  }

  return route.legs.map((leg, index) =>
    `${index + 1}. ${leg.from.ident ?? leg.from.name} to ${leg.to.ident ?? leg.to.name}: ` +
    `${formatDistance(leg.distanceNm)}, TC ${formatCourse(leg.trueCourseDeg)}, MC ${formatCourse(leg.magneticCourseDeg)}, ` +
    `ETE ${formatDuration(leg.estimatedTimeMinutes)}, fuel ${formatFuel(leg.fuelRequiredGal)}`
  );
}

function formatTrainingNavLog(navLog?: TrainingNavLog): string[] {
  if (!navLog || navLog.legs.length === 0) {
    return ['No training navlog legs available. Add at least two waypoints and route wind.'];
  }

  return [
    `Route wind: ${Math.round(navLog.wind.directionDeg).toString().padStart(3, '0')} deg at ${Math.round(navLog.wind.speedKts)} kt`,
    `Totals: ${formatDuration(navLog.totalTimeMinutes)}, ${formatFuel(navLog.totalFuelGal)}`,
    `Formula: ${navLog.legs[0].formula}`,
    ...navLog.legs.map((leg, index) =>
      `${index + 1}. ${leg.from} to ${leg.to}: TC ${formatCourse(leg.trueCourseDeg)}, MC ${formatCourse(leg.magneticCourseDeg)}, ` +
      `WCA ${formatSignedDegrees(leg.windCorrectionAngleDeg)}, TH ${formatCourse(leg.trueHeadingDeg)}, ` +
      `MH ${formatCourse(leg.magneticHeadingDeg)}, CH ${formatCourse(leg.compassHeadingDeg)}, ` +
      `GS ${Math.round(leg.groundSpeedKts)} kt, ETE ${formatDuration(leg.estimatedTimeMinutes)}, fuel ${formatFuel(leg.fuelRequiredGal)}`
    ),
  ];
}

function formatFuelPlanning(result: FuelPlanningResult | undefined, route: RouteAnalysis): string[] {
  if (!result) {
    return [
      `Trip fuel: ${formatFuel(route.summary.tripFuelGal)}`,
      `Reserve fuel: ${formatFuel(route.summary.reserveFuelGal)}`,
      `Contingency fuel: ${formatFuel(route.summary.contingencyFuelGal)}`,
      `Total required: ${formatFuel(route.summary.totalFuelRequiredGal)}`,
      `Usable fuel: ${formatFuel(route.summary.usableFuelGal)}`,
      `Remaining after planned reserve/contingency: ${formatFuel(route.summary.fuelRemainingGal)}`,
      `Fuel status: ${route.summary.fuelStatus.toUpperCase()}`,
      'Trust: Not trusted. This is the legacy still-air estimate.',
    ];
  }

  const lines = [
    `Status: ${result.status.toUpperCase()} - ${result.message}`,
    `Trust: ${result.trusted ? 'Trusted approved-profile calculation' : 'Not trusted for dispatch'}`,
    `Trip fuel: ${formatFuelQuantity(result.tripFuel)}`,
    `Total required: ${formatFuelQuantity(result.totalRequiredFuel)}`,
    `Usable fuel: ${formatFuelQuantity(result.usableFuel)}`,
    `Expected landing fuel: ${formatFuelQuantity(result.expectedLandingFuel)}`,
    `Reserve margin: ${formatFuelQuantity(result.remainingFuel)}`,
  ];

  if (result.legs.length > 0) {
    lines.push('Route legs:');
    lines.push(...result.legs.map((leg, index) =>
      `${index + 1}. ${leg.from} to ${leg.to}: ${formatDistance(leg.distanceNm)}, ` +
      `TC ${formatCourse(leg.trueCourseDeg)}, GS ${Math.round(leg.groundSpeedKts)} kt, ` +
      `ETE ${formatDuration(leg.estimatedTimeMinutes)}, fuel ${formatFuelQuantity(leg.fuel)}`
    ));
  }

  if (result.breakdown.length > 0) {
    lines.push('Breakdown:');
    lines.push(...result.breakdown.map((item) =>
      `${item.label}: ${formatFuelQuantity(item.quantity)} - ${item.detail}`
    ));
  }

  if (result.issues.length > 0) {
    lines.push(...result.issues.map((issue) => `WARNING: ${issue}`));
  }

  return lines;
}

function formatWeightBalance(result?: WeightBalanceResult): string[] {
  if (!result) {
    return ['Status: UNCONFIGURED - W&B has not been calculated.'];
  }

  const lines = [
    `Status: ${getWeightBalanceStatusLabel(result.status).toUpperCase()} - ${result.message}`,
    ...[result.ramp, result.takeoff, result.landing]
      .filter(isWeightBalanceStateResult)
      .map((state) =>
        `${state.label.toUpperCase()}: ${Math.round(state.weightLb)} lb @ ${state.armIn.toFixed(2)} in CG` +
        `${state.forwardLimitIn !== undefined && state.aftLimitIn !== undefined ? ` (limits ${state.forwardLimitIn.toFixed(2)}-${state.aftLimitIn.toFixed(2)} in)` : ''}` +
        `${state.maxWeightLb !== undefined ? `, max ${Math.round(state.maxWeightLb)} lb` : ''}`
      ),
  ];

  if (result.issues.length > 0) {
    lines.push(...result.issues.map((issue) => `ISSUE: ${issue}`));
  }

  return lines;
}

function formatWeather(weather: WeatherReport[]): string[] {
  if (weather.length === 0) {
    return ['No METAR/TAF data loaded in Halo. Obtain official weather before dispatch.'];
  }

  return weather.map((report) => `${report.icao}: ${report.flightCategory} ${report.raw}`);
}

function formatAirspace(alerts: RouteAirspaceAlert[]): string[] {
  if (alerts.length === 0) {
    return ['No Halo airspace intersections recorded. Continue official chart and NOTAM review.'];
  }

  return alerts.map((alert) => {
    const category = [alert.airspaceType, alert.airspaceClass].filter(Boolean).join(' ');
    const vertical = [alert.lowerLimit ?? 'lower unknown', alert.upperLimit ?? 'upper unknown'].join(' to ');
    const range = formatDistanceRange(alert);
    return `${alert.level.toUpperCase()}: ${alert.name}${category ? ` (${category})` : ''}${range}, ${vertical} - ${alert.reason}`;
  });
}

function formatAirspaceVerticalProfile(profile?: AirspaceVerticalProfile): string[] {
  if (!profile || profile.items.length === 0) {
    return ['No airspace profile bands available. Continue official chart review.'];
  }

  return [
    `Route distance: ${formatDistance(profile.routeDistanceNm)}, cruise altitude: ${Math.round(profile.cruiseAltitudeFt)} ft, status: ${profile.status.toUpperCase()}`,
    ...profile.items.map(formatAirspaceProfileItem),
  ];
}

function formatAirspaceProfileItem(item: AirspaceVerticalProfileItem): string {
  const vertical = [item.lowerLimit ?? 'lower unknown', item.upperLimit ?? 'upper unknown'].join(' to ');
  return `${item.level.toUpperCase()}: ${item.name}, ${formatDistanceRange(item)}, ${vertical}`;
}

function formatDistanceRange(item: Pick<RouteAirspaceAlert, 'distanceNm' | 'startDistanceNm' | 'endDistanceNm'>): string {
  if (item.startDistanceNm !== undefined && item.endDistanceNm !== undefined) {
    if (Math.abs(item.startDistanceNm - item.endDistanceNm) < 0.1) {
      return ` near ${formatDistance(item.startDistanceNm)}`;
    }

    return ` ${formatDistance(item.startDistanceNm)}-${formatDistance(item.endDistanceNm)} along route`;
  }

  if (item.distanceNm !== undefined) {
    return ` near ${formatDistance(item.distanceNm)}`;
  }

  return ' route range unknown';
}

function formatNotam(review?: RouteNotamReview): string[] {
  if (!review) {
    return ['NOTAM state unavailable. Use official sources before flight.'];
  }

  const lines = [
    `Source: ${review.source}`,
    `Official source URL: ${review.sourceUrl}`,
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    `Route locations: ${review.locations.length ? review.locations.join(', ') : 'none prepared'}`,
  ];

  if (review.notams.length === 0) {
    lines.push('No live NOTAM records are included in this pack. Obtain the official PIB before flight.');
    return lines;
  }

  lines.push(...review.notams.map((notam) =>
    `${notam.severity.toUpperCase()}: ${notam.location} ${notam.id} ${notam.category} - ${notam.text}`
  ));

  return lines;
}

function routeLabel(waypoints: Waypoint[]): string {
  if (waypoints.length === 0) return 'Untitled route';
  return waypoints.map((waypoint) => waypoint.ident ?? waypoint.name).join(' -> ');
}

function formatSignedDegrees(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded} deg`;
}

function isWeightBalanceStateResult(value: WeightBalanceStateResult | undefined): value is WeightBalanceStateResult {
  return Boolean(value);
}
