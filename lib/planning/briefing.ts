import type {
  AircraftProfile,
  AirspaceVerticalProfile,
  AirspaceVerticalProfileItem,
  BriefingDigest,
  BriefingDigestItem,
  BriefingDigestStatus,
  BriefingRisk,
  DataFreshness,
  DispatchBriefingPackage,
  DispatchBriefingSection,
  EmergencyPlanningReview,
  FlightAdminReview,
  FilingWorkflowReview,
  FuelPlanningResult,
  GridMoraReview,
  RouteAirfieldBrief,
  PersonalMinimums,
  RouteAirspaceAlert,
  RouteAnalysis,
  RouteIntelligenceReview,
  RouteNotam,
  RouteNotamReview,
  RouteWeatherReview,
  TrainingNavLog,
  TrainingNavLogLeg,
  WeightBalanceResult,
  WeightBalanceStateResult,
  Waypoint,
  WeatherReport,
} from '@/types/planning';
import { formatCourse, formatDistance, formatDuration, formatFuel } from './navigation';
import { formatRouteAirfieldBriefLines } from './airfieldBrief';
import { isBelowPersonalMinimums } from './weather';
import { formatEmergencyPlanningLines } from './emergencyPlanning';
import { formatFilingWorkflowLines } from './filingReminder';
import { formatFlightAdminLines } from './flightAdmin';
import { formatFuelQuantity } from './fuel';
import { formatGridMoraReviewLines } from './gridMora';
import { formatRouteIntelligenceReviewLines } from './routeIntelligence';
import { formatRouteWeatherReviewLines } from './routeWeather';
import { getWeightBalanceStatusLabel } from './weightBalance';

export function buildRiskAssessment(
  route: RouteAnalysis,
  weather: WeatherReport[],
  minimums: PersonalMinimums,
  routeAirspaceAlerts: RouteAirspaceAlert[] = [],
  routeNotamReview?: RouteNotamReview,
  weightBalanceResult?: WeightBalanceResult,
  filingReview?: FilingWorkflowReview,
  emergencyReview?: EmergencyPlanningReview,
  flightAdminReview?: FlightAdminReview,
  fuelPlanningResult?: FuelPlanningResult,
  gridMoraReview?: GridMoraReview,
  routeIntelligenceReview?: RouteIntelligenceReview,
  routeWeatherReview?: RouteWeatherReview,
  routeAirfieldBrief?: RouteAirfieldBrief
): BriefingRisk[] {
  const risks: BriefingRisk[] = [];

  if (route.summary.legCount === 0) {
    risks.push({
      id: 'route-empty',
      level: 'critical',
      title: 'Route incomplete',
      detail: 'Add at least two waypoints before treating the briefing as usable.',
    });
  }

  addFuelPlanningRisks(risks, route, fuelPlanningResult);

  const belowMinimums = weather.filter((report) => isBelowPersonalMinimums(report, minimums));
  if (belowMinimums.length > 0) {
    risks.push({
      id: 'weather-minimums',
      level: 'critical',
      title: 'Weather below personal minimums',
      detail: belowMinimums.map((report) => `${report.icao} ${report.flightCategory}`).join(', '),
    });
  }

  const missingWeather = route.legs
    .flatMap((leg) => [leg.from, leg.to])
    .filter((waypoint, index, list) => waypoint.ident && list.findIndex((item) => item.ident === waypoint.ident) === index)
    .filter((waypoint) => !weather.some((report) => report.icao === waypoint.ident));

  if (missingWeather.length > 0) {
    risks.push({
      id: 'weather-missing',
      level: 'caution',
      title: 'Weather not confirmed for every airport',
      detail: missingWeather.map((waypoint) => waypoint.ident).join(', '),
    });
  }

  const criticalAirspaces = routeAirspaceAlerts.filter((alert) => alert.level === 'critical');
  const cautionAirspaces = routeAirspaceAlerts.filter((alert) => alert.level === 'caution');

  if (criticalAirspaces.length > 0) {
    risks.push({
      id: 'airspace-critical',
      level: 'critical',
      title: 'Cruise altitude intersects controlled or special-use airspace',
      detail: formatAirspaceAlertSummary(criticalAirspaces),
    });
  } else if (cautionAirspaces.length > 0) {
    risks.push({
      id: 'airspace-caution',
      level: 'caution',
      title: 'Route airspace review required',
      detail: formatAirspaceAlertSummary(cautionAirspaces),
    });
  }

  addWeightBalanceRisks(risks, weightBalanceResult);
  addNotamRisks(risks, routeNotamReview);
  addFilingWorkflowRisks(risks, filingReview);
  addFlightAdminRisks(risks, flightAdminReview);
  addEmergencyRisks(risks, emergencyReview);
  addGridMoraRisks(risks, gridMoraReview);
  addRouteIntelligenceRisks(risks, routeIntelligenceReview);
  addRouteWeatherRisks(risks, routeWeatherReview);
  addRouteAirfieldRisks(risks, routeAirfieldBrief);

  if (risks.length === 0) {
    risks.push({
      id: 'route-ready',
      level: 'ok',
      title: 'Planning data consistent',
      detail: 'Route, fuel, available weather, airspace review, and optional admin records are internally consistent. Continue official preflight review before flight.',
    });
  }

  return risks;
}

export function buildBriefingText(params: {
  routeName: string;
  aircraft: AircraftProfile;
  route: RouteAnalysis;
  waypoints: Waypoint[];
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
  routeIntelligenceReview?: RouteIntelligenceReview;
  routeWeatherReview?: RouteWeatherReview;
  routeAirfieldBrief?: RouteAirfieldBrief;
  departureTime?: string;
  cruiseAltitudeFt?: number;
  notes?: string;
}): string {
  const {
    routeName,
    aircraft,
    route,
    waypoints,
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
    routeIntelligenceReview,
    routeWeatherReview,
    routeAirfieldBrief,
    departureTime,
    cruiseAltitudeFt,
    notes,
  } = params;

  const lines = [
    'HALO FLIGHT BRIEFING',
    `Generated: ${new Date().toISOString()}`,
    '',
    'PILOT DIGEST',
    ...formatBriefingDigest(buildBriefingDigest({
      routeName,
      route,
      risks,
      routeNotamReview,
      routeAirspaceAlerts,
      weightBalanceResult,
      weather,
      dataFreshness,
      fuelPlanningResult,
      gridMoraReview,
      filingReview,
      flightAdminReview,
      emergencyReview,
      routeIntelligenceReview,
      routeWeatherReview,
      routeAirfieldBrief,
    })),
    '',
    'FLIGHT SUMMARY',
    `Route: ${routeName || routeLabel(waypoints)}`,
    `Aircraft: ${aircraft.registration} ${aircraft.type} (${aircraft.name})`,
    `Departure time: ${departureTime || 'Not set'}`,
    `Cruise altitude: ${cruiseAltitudeFt ? `${cruiseAltitudeFt} ft` : 'Not set'}`,
    `Distance: ${formatDistance(route.summary.totalDistanceNm)}`,
    `ETE: ${formatDuration(route.summary.estimatedTimeMinutes)}`,
    `Fuel required: ${fuelPlanningResult ? formatFuelQuantity(fuelPlanningResult.totalRequiredFuel) : formatFuel(route.summary.totalFuelRequiredGal)}`,
    `Fuel remaining: ${fuelPlanningResult ? formatFuelQuantity(fuelPlanningResult.remainingFuel) : formatFuel(route.summary.fuelRemainingGal)}`,
    `Fuel trust: ${fuelPlanningResult?.trusted ? 'Approved POH/AFM profile' : 'Legacy/untrusted estimate'}`,
    '',
    'ROUTE INTELLIGENCE',
    ...formatRouteIntelligenceReviewLines(routeIntelligenceReview),
    '',
    'NAVIGATION LOG',
    ...route.legs.map((leg, index) => {
      return `${index + 1}. ${leg.from.ident ?? leg.from.name} to ${leg.to.ident ?? leg.to.name}: ${formatDistance(
        leg.distanceNm
      )}, TC ${formatCourse(leg.trueCourseDeg)}, MC ${formatCourse(leg.magneticCourseDeg)}, ${formatDuration(
        leg.estimatedTimeMinutes
      )}, ${formatFuel(leg.fuelRequiredGal)}`;
    }),
    '',
    'TRAINING / CHECKRIDE NAVLOG',
    ...formatTrainingNavLog(trainingNavLog),
    '',
    'FUEL PLANNING',
    ...formatFuelPlanningResultLines(fuelPlanningResult),
    '',
    'ROUTE WEATHER REVIEW',
    ...formatRouteWeatherReviewLines(routeWeatherReview),
    '',
    'WEATHER',
    ...(weather.length
      ? weather.map((report) => `${report.icao}: ${report.flightCategory} ${report.raw}`)
      : ['No METAR data loaded.']),
    '',
    'AIRSPACE REVIEW',
    ...(routeAirspaceAlerts.length
      ? routeAirspaceAlerts.map(formatBriefingAirspaceAlert)
      : ['No rendered OpenAIP airspace intersections recorded for the visible route samples. Continue with official chart and NOTAM review.']),
    '',
    'AIRSPACE VERTICAL PROFILE',
    ...formatAirspaceVerticalProfile(airspaceVerticalProfile),
    '',
    'GRID MORA',
    ...formatGridMoraReviewLines(gridMoraReview),
    '',
    'WEIGHT & BALANCE',
    ...formatBriefingWeightBalance(weightBalanceResult),
    '',
    'ROUTE AIRFIELDS / FREQUENCIES',
    ...formatRouteAirfieldBriefLines(routeAirfieldBrief),
    '',
    'DATA FRESHNESS',
    ...formatBriefingFreshness(dataFreshness),
    '',
    'RISK REVIEW',
    ...risks.map((risk) => `${risk.level.toUpperCase()}: ${risk.title} - ${risk.detail}`),
    '',
    'NOTAM REVIEW',
    ...formatBriefingNotamReview(routeNotamReview),
    '',
    'FLIGHT ADMIN',
    ...formatFlightAdminLines(flightAdminReview, filingReview),
    '',
    'FILING & CLOSE REMINDER',
    ...formatFilingWorkflowLines(filingReview),
    '',
    'EMERGENCY / FORCED-LANDING',
    ...formatEmergencyPlanningLines(emergencyReview),
    '',
    'NOTES',
    notes || 'No pilot notes entered.',
  ];

  return lines.join('\n');
}

export function buildBriefingDigest(params: {
  routeName: string;
  route: RouteAnalysis;
  risks: BriefingRisk[];
  weather: WeatherReport[];
  routeAirspaceAlerts?: RouteAirspaceAlert[];
  routeNotamReview?: RouteNotamReview;
  weightBalanceResult?: WeightBalanceResult;
  dataFreshness?: DataFreshness[];
  fuelPlanningResult?: FuelPlanningResult;
  gridMoraReview?: GridMoraReview;
  filingReview?: FilingWorkflowReview;
  flightAdminReview?: FlightAdminReview;
  emergencyReview?: EmergencyPlanningReview;
  routeIntelligenceReview?: RouteIntelligenceReview;
  routeWeatherReview?: RouteWeatherReview;
  routeAirfieldBrief?: RouteAirfieldBrief;
}): BriefingDigest {
  const items: BriefingDigestItem[] = [];

  for (const risk of params.risks) {
    if (risk.level === 'ok') continue;
    items.push({
      id: risk.id,
      level: risk.level === 'critical' ? 'critical' : 'caution',
      title: risk.title,
      action: risk.detail,
      source: sourceForRisk(risk.id),
    });
  }

  const hasFuelDigestItem = items.some((item) => item.id.startsWith('fuel-'));
  if (params.fuelPlanningResult?.trusted && params.route.summary.legCount > 0 && !hasFuelDigestItem) {
    items.push({
      id: 'fuel-ready',
      level: 'info',
      title: 'Fuel margin calculated',
      action: `${formatFuelQuantity(params.fuelPlanningResult.totalRequiredFuel)} required with ${formatFuelQuantity(params.fuelPlanningResult.remainingFuel)} remaining after final reserve.`,
      source: 'Fuel',
    });
  } else if (!params.fuelPlanningResult && params.route.summary.legCount > 0 && params.route.summary.fuelStatus === 'ok' && !hasFuelDigestItem) {
    items.push({
      id: 'fuel-legacy',
      level: 'caution',
      title: 'Fuel uses legacy estimate',
      action: `${formatFuel(params.route.summary.totalFuelRequiredGal)} required by basic distance/cruise-burn estimate. Configure and approve a POH/AFM profile for trusted fuel.`,
      source: 'Fuel',
    });
  }

  const reviewableAirspaces = params.routeAirspaceAlerts?.filter((alert) => alert.requiresReview) ?? [];
  if (reviewableAirspaces.length === 0 && params.routeAirspaceAlerts && params.routeAirspaceAlerts.length > 0) {
    items.push({
      id: 'airspace-reviewed',
      level: 'info',
      title: 'Airspace reviewed',
      action: `${params.routeAirspaceAlerts.length} airspace crossing${params.routeAirspaceAlerts.length === 1 ? '' : 's'} found outside the selected cruise altitude or informational only.`,
      source: 'Airspace',
    });
  }

  if (params.weightBalanceResult?.status === 'within-limits') {
    items.push({
      id: 'weight-balance-ready',
      level: 'info',
      title: 'W&B within limits',
      action: params.weightBalanceResult.message,
      source: 'W&B',
    });
  }

  if (params.weather.length === 0 && params.route.summary.legCount > 0) {
    items.push({
      id: 'weather-digest-missing',
      level: 'caution',
      title: 'Weather digest incomplete',
      action: 'Load route METAR/TAF data or obtain official weather before dispatch.',
      source: 'Weather',
    });
  }

  addFilingDigestItems(items, params.filingReview);
  addFlightAdminDigestItems(items, params.flightAdminReview);
  addEmergencyDigestItems(items, params.emergencyReview);
  addGridMoraDigestItems(items, params.gridMoraReview);
  addRouteIntelligenceDigestItems(items, params.routeIntelligenceReview);
  addRouteWeatherDigestItems(items, params.routeWeatherReview);
  addRouteAirfieldDigestItems(items, params.routeAirfieldBrief);

  for (const freshness of params.dataFreshness ?? []) {
    if (freshness.status === 'current') continue;
    items.push({
      id: `freshness-${freshness.source.toLowerCase().replace(/\W+/g, '-')}`,
      level: 'caution',
      title: `${freshness.source} freshness ${freshness.status}`,
      action: freshness.label,
      source: 'Freshness',
    });
  }

  const sortedItems = sortDigestItems(items).slice(0, 6);
  const hasCritical = sortedItems.some((item) => item.level === 'critical');
  const hasCaution = sortedItems.some((item) => item.level === 'caution');
  const status = hasCritical ? 'stop' : hasCaution ? 'review' : 'ready';

  return {
    status,
    title: digestTitle(status),
    summary: digestSummary(status, params.routeName, sortedItems),
    items: sortedItems.length ? sortedItems : [{
      id: 'digest-ready',
      level: 'info',
      title: 'No blocking items found',
      action: 'Planning data is internally consistent. Continue official preflight briefing before flight.',
      source: 'Halo',
    }],
    generatedAt: new Date().toISOString(),
  };
}

function addFuelPlanningRisks(
  risks: BriefingRisk[],
  route: RouteAnalysis,
  fuelPlanningResult?: FuelPlanningResult
) {
  if (!fuelPlanningResult) {
    if (route.summary.fuelStatus === 'critical') {
      risks.push({
        id: 'fuel-critical',
        level: 'critical',
        title: 'Fuel exceeds usable capacity',
        detail: 'Trip, reserve, and contingency fuel are greater than the selected aircraft usable fuel.',
      });
    } else if (route.summary.fuelStatus === 'caution') {
      risks.push({
        id: 'fuel-caution',
        level: 'caution',
        title: 'Fuel margin is tight',
        detail: 'Fuel remaining after reserves is less than half of the reserve fuel quantity.',
      });
    } else if (route.summary.legCount > 0) {
      risks.push({
        id: 'fuel-legacy-estimate',
        level: 'caution',
        title: 'Fuel uses legacy estimate',
        detail: 'Configure and approve a POH/AFM performance profile before trusting Halo fuel numbers.',
      });
    }
    return;
  }

  if (fuelPlanningResult.status === 'needs-route') return;

  if (fuelPlanningResult.status === 'critical') {
    risks.push({
      id: 'fuel-critical',
      level: 'critical',
      title: 'Fuel exceeds usable capacity',
      detail: fuelPlanningResult.message,
    });
    return;
  }

  if (!fuelPlanningResult.trusted) {
    risks.push({
      id: `fuel-${fuelPlanningResult.status}`,
      level: 'caution',
      title: 'Fuel result is not trusted',
      detail: fuelPlanningResult.message,
    });
    return;
  }

  if (fuelPlanningResult.status === 'caution') {
    risks.push({
      id: 'fuel-caution',
      level: 'caution',
      title: 'Fuel margin is tight',
      detail: fuelPlanningResult.message,
    });
  }
}

function addGridMoraRisks(risks: BriefingRisk[], review?: GridMoraReview) {
  if (!review || review.status === 'needs-route' || review.status === 'complete') return;

  risks.push({
    id: `grid-mora-${review.status}`,
    level: 'caution',
    title: 'Grid MORA not confirmed in Halo',
    detail: review.message,
  });
}

function addWeightBalanceRisks(risks: BriefingRisk[], result?: WeightBalanceResult) {
  if (!result || result.status === 'unconfigured') {
    risks.push({
      id: 'weight-balance-unconfigured',
      level: 'caution',
      title: 'W&B needs POH setup',
      detail: result?.message ?? 'Enter aircraft-specific POH/AFM W&B data before using Halo for balance checks.',
    });
    return;
  }

  if (result.status === 'incomplete') {
    risks.push({
      id: 'weight-balance-incomplete',
      level: 'caution',
      title: 'W&B setup incomplete',
      detail: result.issues.join(' '),
    });
    return;
  }

  if (result.status === 'out-of-limits') {
    risks.push({
      id: 'weight-balance-out-of-limits',
      level: 'critical',
      title: 'W&B out of limits',
      detail: result.issues.join(' '),
    });
    return;
  }

  if (result.status === 'caution') {
    risks.push({
      id: 'weight-balance-caution',
      level: 'caution',
      title: 'W&B near limit',
      detail: result.message,
    });
  }
}

function addFilingWorkflowRisks(risks: BriefingRisk[], review?: FilingWorkflowReview) {
  if (!review || review.status === 'not-planned') {
    return;
  }

  if (review.status === 'overdue') {
    risks.push({
      id: 'filing-close-overdue',
      level: 'critical',
      title: 'Flight close reminder overdue',
      detail: review.message,
    });
    return;
  }

  if (review.status === 'due-soon') {
    risks.push({
      id: 'filing-close-due-soon',
      level: 'caution',
      title: 'Flight close reminder due soon',
      detail: review.message,
    });
  }

}

function addFlightAdminRisks(risks: BriefingRisk[], review?: FlightAdminReview) {
  if (!review) return;

  if (review.filingStatus === 'rejected') {
    risks.push({
      id: 'flight-admin-filing-rejected',
      level: 'critical',
      title: 'Flight plan filing rejected',
      detail: review.filingMessage,
    });
    return;
  }

  if (review.notamStatus === 'needs-rebrief') {
    risks.push({
      id: 'flight-admin-notam-rebrief',
      level: 'caution',
      title: 'Recorded NOTAM briefing needs rebrief',
      detail: review.notamMessage,
    });
  }
}

function addEmergencyRisks(risks: BriefingRisk[], review?: EmergencyPlanningReview) {
  if (!review || review.status === 'needs-route') return;

  if (review.status === 'review' || review.candidates.length === 0) {
    risks.push({
      id: 'emergency-candidates-missing',
      level: 'caution',
      title: 'Emergency landing options need review',
      detail: review.message,
    });
  }
}

function addFilingDigestItems(items: BriefingDigestItem[], review?: FilingWorkflowReview) {
  if (!review) return;

  if (review.status === 'overdue') {
    items.push({
      id: 'filing-overdue',
      level: 'critical',
      title: 'Close-flight reminder overdue',
      action: review.message,
      source: 'Filing',
    });
    return;
  }

  if (review.status === 'not-planned') {
    return;
  }

  if (review.status === 'due-soon') {
    items.push({
      id: 'filing-due-soon',
      level: 'caution',
      title: 'Close-flight reminder due soon',
      action: review.message,
      source: 'Filing',
    });
  }

  if (review.status === 'planned' || review.status === 'closed') {
    items.push({
      id: 'filing-ready',
      level: 'info',
      title: 'Filing workflow tracked',
      action: review.message,
      source: 'Filing',
    });
  }
}

function addFlightAdminDigestItems(items: BriefingDigestItem[], review?: FlightAdminReview) {
  if (!review) return;

  if (review.filingStatus === 'rejected') {
    items.push({
      id: 'flight-admin-filing-rejected',
      level: 'critical',
      title: 'Flight plan filing rejected',
      action: review.filingMessage,
      source: 'Flight Admin',
    });
  }

  if (review.notamStatus === 'needs-rebrief') {
    items.push({
      id: 'flight-admin-notam-rebrief',
      level: 'caution',
      title: 'Official NOTAM record needs rebrief',
      action: review.notamMessage,
      source: 'Flight Admin',
    });
    return;
  }

  if (review.notamStatus === 'not-recorded') {
    items.push({
      id: 'flight-admin-notam-not-recorded',
      level: 'info',
      title: 'NOTAM record optional',
      action: 'Official NOTAM briefing is not recorded in Halo. Use File2Fly/official sources before flight if required.',
      source: 'Flight Admin',
    });
  } else if (review.notamStatus === 'not-applicable') {
    items.push({
      id: 'flight-admin-notam-not-applicable',
      level: 'info',
      title: 'NOTAM record marked not applicable',
      action: review.notamMessage,
      source: 'Flight Admin',
    });
  } else if (review.notamStatus === 'completed') {
    items.push({
      id: 'flight-admin-notam-completed',
      level: 'info',
      title: 'Official NOTAM briefing recorded',
      action: review.notamMessage,
      source: 'Flight Admin',
    });
  }

  if (review.filingStatus === 'not-filing') {
    items.push({
      id: 'flight-admin-not-filing',
      level: 'info',
      title: 'Flight plan filing optional',
      action: review.filingMessage,
      source: 'Flight Admin',
    });
  } else if (review.filingStatus !== 'rejected') {
    items.push({
      id: 'flight-admin-filing-recorded',
      level: 'info',
      title: 'Flight plan filing record',
      action: review.filingMessage,
      source: 'Flight Admin',
    });
  }
}

function addEmergencyDigestItems(items: BriefingDigestItem[], review?: EmergencyPlanningReview) {
  if (!review) return;

  if (review.status === 'review' || review.candidates.length === 0) {
    items.push({
      id: 'emergency-review',
      level: 'caution',
      title: 'Mark emergency landing options',
      action: review.message,
      source: 'Emergency',
    });
    return;
  }

  if (review.status === 'available') {
    items.push({
      id: 'emergency-available',
      level: 'info',
      title: 'Emergency options available',
      action: `${review.candidates.length} candidate${review.candidates.length === 1 ? '' : 's'} listed; glide radius ${review.glideRadiusNm.toFixed(1)} nm from selected cruise altitude.`,
      source: 'Emergency',
    });
  }
}

function addGridMoraDigestItems(items: BriefingDigestItem[], review?: GridMoraReview) {
  if (!review || review.status === 'needs-route') return;

  if (review.status === 'complete') {
    items.push({
      id: 'grid-mora-ready',
      level: 'info',
      title: 'Grid MORA provider data loaded',
      action: `${review.cells.length} route Grid MORA cell${review.cells.length === 1 ? '' : 's'} loaded from ${review.source}.`,
      source: 'Grid MORA',
    });
    return;
  }

  items.push({
    id: `grid-mora-${review.status}`,
    level: 'caution',
    title: 'Grid MORA requires official source',
    action: review.message,
    source: 'Grid MORA',
  });
}

function addRouteIntelligenceRisks(risks: BriefingRisk[], review?: RouteIntelligenceReview) {
  if (!review || review.status === 'needs-route' || review.status === 'ready') return;

  risks.push({
    id: `route-intelligence-${review.status}`,
    level: 'caution',
    title: 'Route provider review unavailable',
    detail: review.message,
  });
}

function addRouteWeatherRisks(risks: BriefingRisk[], review?: RouteWeatherReview) {
  if (!review || review.status === 'needs-route' || review.status === 'current' || review.status === 'manual-wind') return;

  risks.push({
    id: `route-weather-${review.status}`,
    level: 'caution',
    title: 'Route weather incomplete',
    detail: review.message,
  });
}

function addRouteAirfieldRisks(risks: BriefingRisk[], brief?: RouteAirfieldBrief) {
  if (!brief || brief.status === 'needs-route' || brief.status === 'available') return;

  risks.push({
    id: `route-airfield-${brief.status}`,
    level: 'caution',
    title: 'Route airfield data needs official check',
    detail: brief.message,
  });
}

function addRouteIntelligenceDigestItems(items: BriefingDigestItem[], review?: RouteIntelligenceReview) {
  if (!review || review.status === 'needs-route') return;

  if (review.status === 'ready') {
    const available = review.candidates.filter((candidate) => candidate.status === 'available').length;
    items.push({
      id: 'route-intelligence-ready',
      level: 'info',
      title: 'Route advisor candidates ready',
      action: `${available} local route candidate${available === 1 ? '' : 's'} available; provider route is ${review.providerConfigured ? 'configured' : 'not configured'}.`,
      source: 'Route',
    });
    return;
  }

  items.push({
    id: `route-intelligence-${review.status}`,
    level: 'caution',
    title: 'Provider route not available',
    action: review.message,
    source: 'Route',
  });
}

function addRouteWeatherDigestItems(items: BriefingDigestItem[], review?: RouteWeatherReview) {
  if (!review || review.status === 'needs-route') return;

  if (review.status === 'current' || review.status === 'manual-wind') {
    items.push({
      id: 'route-weather-ready',
      level: review.status === 'manual-wind' ? 'caution' : 'info',
      title: review.status === 'manual-wind' ? 'Weather loaded with manual wind' : 'Route weather loaded',
      action: review.message,
      source: 'Weather',
    });
    return;
  }

  items.push({
    id: `route-weather-${review.status}`,
    level: 'caution',
    title: 'Route weather incomplete',
    action: review.message,
    source: 'Weather',
  });
}

function addRouteAirfieldDigestItems(items: BriefingDigestItem[], brief?: RouteAirfieldBrief) {
  if (!brief || brief.status === 'needs-route') return;

  items.push({
    id: `route-airfield-${brief.status}`,
    level: brief.status === 'available' ? 'info' : 'caution',
    title: brief.status === 'available' ? 'Route airfield digest ready' : 'Route airfield data incomplete',
    action: brief.message,
    source: 'Airfields',
  });
}

export function buildDispatchBriefingPackage(params: {
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
  routeIntelligenceReview?: RouteIntelligenceReview;
  routeWeatherReview?: RouteWeatherReview;
  routeAirfieldBrief?: RouteAirfieldBrief;
  departureTime?: string;
  cruiseAltitudeFt?: number;
  notes?: string;
  now?: Date;
}): DispatchBriefingPackage {
  const generatedAt = (params.now ?? new Date()).toISOString();
  const officialSources = [
    params.routeNotamReview?.sourceUrl ?? 'https://file2fly.atns.co.za/aes/login.jsp',
    params.gridMoraReview?.sourceUrl ?? 'Licensed Grid MORA provider not configured in Halo',
    params.routeAirfieldBrief?.sourceUrl ?? 'https://www.caa.co.za/industry-information/aeronautical-information/',
    'https://aviationweather.gov/',
  ];
  const sections: DispatchBriefingSection[] = [
    {
      id: 'route-advisor',
      title: 'Route Advisor Selection',
      status: sectionStatusFromReview(params.routeIntelligenceReview?.status),
      lines: formatRouteIntelligenceReviewLines(params.routeIntelligenceReview),
    },
    {
      id: 'navlog',
      title: 'Navigation Log',
      status: params.route.summary.legCount > 0 ? 'ready' : 'stop',
      lines: params.route.legs.length
        ? params.route.legs.map((leg, index) =>
            `${index + 1}. ${leg.from.ident ?? leg.from.name} to ${leg.to.ident ?? leg.to.name}: ${formatDistance(leg.distanceNm)}, TC ${formatCourse(leg.trueCourseDeg)}, MC ${formatCourse(leg.magneticCourseDeg)}, ${formatDuration(leg.estimatedTimeMinutes)}`
          )
        : ['No navlog legs available.'],
    },
    {
      id: 'fuel-policy',
      title: 'Fuel Policy',
      status: sectionStatusFromFuel(params.fuelPlanningResult),
      lines: formatFuelPlanningResultLines(params.fuelPlanningResult),
    },
    {
      id: 'weight-balance',
      title: 'Weight & Balance Manifest',
      status: sectionStatusFromWeightBalance(params.weightBalanceResult),
      lines: formatBriefingWeightBalance(params.weightBalanceResult),
    },
    {
      id: 'weather',
      title: 'Weather',
      status: sectionStatusFromWeather(params.routeWeatherReview),
      lines: [
        ...formatRouteWeatherReviewLines(params.routeWeatherReview),
        ...params.weather.map((report) => `${report.icao}: ${report.flightCategory} ${report.raw}`),
      ],
    },
    {
      id: 'airspace-notam-admin',
      title: 'Airspace, NOTAM & Admin Handoff',
      status: sectionStatusFromAdmin(params.routeNotamReview, params.flightAdminReview),
      lines: [
        'Airspace:',
        ...(params.routeAirspaceAlerts?.length
          ? params.routeAirspaceAlerts.map(formatBriefingAirspaceAlert)
          : ['No rendered OpenAIP airspace intersections recorded. Continue official chart and NOTAM review.']),
        'NOTAM:',
        ...formatBriefingNotamReview(params.routeNotamReview),
        'Flight admin:',
        ...formatFlightAdminLines(params.flightAdminReview, params.filingReview),
      ],
    },
    {
      id: 'route-frequencies',
      title: 'Route Frequencies & Airfields',
      status: params.routeAirfieldBrief?.status === 'available' ? 'ready' : 'review',
      lines: formatRouteAirfieldBriefLines(params.routeAirfieldBrief),
    },
    {
      id: 'emergency',
      title: 'Emergency Plan',
      status: params.emergencyReview?.status === 'available' ? 'ready' : 'review',
      lines: formatEmergencyPlanningLines(params.emergencyReview),
    },
    {
      id: 'data-freshness',
      title: 'Data Freshness',
      status: params.dataFreshness?.some((item) => item.status !== 'current') ? 'review' : 'ready',
      lines: formatBriefingFreshness(params.dataFreshness ?? []),
    },
  ];

  return {
    id: `dispatch-${generatedAt}`,
    title: 'Halo Dispatch Briefing Package',
    generatedAt,
    routeName: params.routeName || routeLabel(params.waypoints),
    sections,
    officialHandoff: {
      required: true,
      sources: Array.from(new Set(officialSources)),
      message: 'Halo prepared the dispatch package, but official weather, NOTAM, filing, AIP/chart, and licensed navdata checks remain manual unless an authorized provider is configured.',
    },
    dataFreshness: params.dataFreshness ?? [],
  };
}

export function formatDispatchBriefingPackageLines(dispatchPackage: DispatchBriefingPackage): string[] {
  return [
    `${dispatchPackage.title}`,
    `Generated: ${dispatchPackage.generatedAt}`,
    `Route: ${dispatchPackage.routeName}`,
    '',
    'OFFICIAL HANDOFF',
    dispatchPackage.officialHandoff.message,
    ...dispatchPackage.officialHandoff.sources.map((source) => `Source: ${source}`),
    '',
    ...dispatchPackage.sections.flatMap((section) => [
      section.title.toUpperCase(),
      `Status: ${section.status.toUpperCase()}`,
      ...section.lines,
      '',
    ]),
  ];
}

function sectionStatusFromReview(status: RouteIntelligenceReview['status'] | undefined): BriefingDigestStatus {
  if (status === 'needs-route') return 'stop';
  if (status === 'ready') return 'ready';
  return 'review';
}

function sectionStatusFromFuel(result?: FuelPlanningResult): BriefingDigestStatus {
  if (!result || result.status === 'needs-route' || result.status === 'critical' || result.policy?.status === 'critical') return 'stop';
  if (!result.trusted || result.status === 'caution' || result.policy?.status === 'caution') return 'review';
  return 'ready';
}

function sectionStatusFromWeightBalance(result?: WeightBalanceResult): BriefingDigestStatus {
  if (!result || result.status === 'out-of-limits') return 'stop';
  if (result.status === 'within-limits') return 'ready';
  return 'review';
}

function sectionStatusFromWeather(review?: RouteWeatherReview): BriefingDigestStatus {
  if (!review || review.status === 'needs-route' || review.status === 'unavailable') return 'review';
  if (review.status === 'current') return 'ready';
  return 'review';
}

function sectionStatusFromAdmin(
  notamReview?: RouteNotamReview,
  flightAdminReview?: FlightAdminReview
): BriefingDigestStatus {
  if (flightAdminReview?.filingStatus === 'rejected') return 'stop';
  if (notamReview?.status === 'complete' && flightAdminReview?.notamStatus === 'completed') return 'ready';
  return 'review';
}

function routeLabel(waypoints: Waypoint[]): string {
  if (waypoints.length === 0) return 'Untitled route';
  return waypoints.map((waypoint) => waypoint.ident ?? waypoint.name).join(' -> ');
}

function formatBriefingDigest(digest: BriefingDigest): string[] {
  return [
    `Status: ${digest.status.toUpperCase()} - ${digest.title}`,
    digest.summary,
    ...digest.items.map((item, index) =>
      `${index + 1}. ${item.level.toUpperCase()}: ${item.title} [${item.source}] - ${item.action}`
    ),
  ];
}

function sortDigestItems(items: BriefingDigestItem[]): BriefingDigestItem[] {
  const rank: Record<BriefingDigestItem['level'], number> = {
    critical: 0,
    caution: 1,
    info: 2,
  };

  return [...items].sort((a, b) => rank[a.level] - rank[b.level] || a.title.localeCompare(b.title));
}

function digestTitle(status: BriefingDigest['status']): string {
  if (status === 'stop') return 'Resolve critical items before flight';
  if (status === 'review') return 'Pilot review required';
  return 'Planning data ready for official briefing';
}

function digestSummary(
  status: BriefingDigest['status'],
  routeName: string,
  items: BriefingDigestItem[]
): string {
  const route = routeName || 'the planned route';
  if (status === 'stop') {
    return `${route} has ${items.filter((item) => item.level === 'critical').length} critical item${items.filter((item) => item.level === 'critical').length === 1 ? '' : 's'} that must be resolved before dispatch.`;
  }
  if (status === 'review') {
    return `${route} has review items that require pilot confirmation before dispatch.`;
  }
  return `${route} has no Halo-blocking items; continue official weather, NOTAM, chart, and aircraft checks.`;
}

function sourceForRisk(riskId: string): string {
  if (riskId.startsWith('route-weather')) return 'Weather';
  if (riskId.startsWith('route-airfield')) return 'Airfields';
  if (riskId.startsWith('route-intelligence')) return 'Route';
  if (riskId.startsWith('weather')) return 'Weather';
  if (riskId.startsWith('airspace')) return 'Airspace';
  if (riskId.startsWith('notam')) return 'NOTAM';
  if (riskId.startsWith('weight-balance')) return 'W&B';
  if (riskId.startsWith('filing')) return 'Filing';
  if (riskId.startsWith('flight-admin')) return 'Flight Admin';
  if (riskId.startsWith('emergency')) return 'Emergency';
  if (riskId.startsWith('fuel')) return 'Fuel';
  if (riskId.startsWith('grid-mora')) return 'Grid MORA';
  if (riskId.startsWith('route')) return 'Route';
  return 'Risk';
}

function formatAirspaceAlertSummary(alerts: RouteAirspaceAlert[]): string {
  const visible = alerts.slice(0, 5).map((alert) => {
    const category = [alert.airspaceType, alert.airspaceClass].filter(Boolean).join(' ');
    return `${alert.name}${category ? ` (${category})` : ''}`;
  });
  const extra = alerts.length > visible.length ? `; +${alerts.length - visible.length} more` : '';
  return `${visible.join('; ')}${extra}`;
}

function formatBriefingAirspaceAlert(alert: RouteAirspaceAlert): string {
  const category = [alert.airspaceType, alert.airspaceClass].filter(Boolean).join(' ');
  const vertical = [alert.lowerLimit ?? 'lower unknown', alert.upperLimit ?? 'upper unknown'].join(' to ');
  const range = formatAirspaceDistanceRange(alert);
  return `${alert.level.toUpperCase()}: ${alert.name}${category ? ` (${category})` : ''}${range ? `, ${range}` : ''}, ${vertical} - ${alert.reason}`;
}

function addNotamRisks(risks: BriefingRisk[], review?: RouteNotamReview) {
  if (!review || review.status === 'needs-route') {
    risks.push({
      id: 'notam-review',
      level: 'caution',
      title: 'NOTAM review required',
      detail: 'Add a route and complete live NOTAM review before treating the briefing as usable.',
    });
    return;
  }

  if (review.status === 'checking') {
    risks.push({
      id: 'notam-checking',
      level: 'caution',
      title: 'NOTAM review still checking',
      detail: 'Wait for live NOTAM review to finish before dispatch.',
    });
    return;
  }

  if (review.status === 'manual-required') {
    return;
  }

  if (review.status === 'unavailable') {
    risks.push({
      id: 'notam-unavailable',
      level: 'caution',
      title: 'Live NOTAM review unavailable',
      detail: review.message,
    });
    return;
  }

  if (review.status === 'partial') {
    risks.push({
      id: 'notam-partial',
      level: 'caution',
      title: 'Partial NOTAM review',
      detail: review.message,
    });
  }

  const criticalNotams = review.notams.filter((notam) => notam.severity === 'critical');
  const cautionNotams = review.notams.filter((notam) => notam.severity === 'caution');

  if (criticalNotams.length > 0) {
    risks.push({
      id: 'notam-critical',
      level: 'critical',
      title: 'Critical route NOTAMs found',
      detail: formatNotamSummary(criticalNotams),
    });
  } else if (cautionNotams.length > 0) {
    risks.push({
      id: 'notam-caution',
      level: 'caution',
      title: 'Route NOTAMs require review',
      detail: formatNotamSummary(cautionNotams),
    });
  }
}

function formatBriefingNotamReview(review?: RouteNotamReview): string[] {
  if (!review) {
    return ['Live NOTAM review has not run. Check the official NOTAM source before flight.'];
  }

  const sourceLine = `Source: ${formatNotamReviewSource(review.source)} (${review.sourceUrl})`;
  const locationLabel = review.status === 'complete' || review.status === 'partial'
    ? 'Route locations checked'
    : 'Route locations prepared';
  const locationLine = review.locations.length
    ? `${locationLabel}: ${review.locations.join(', ')}`
    : `${locationLabel}: none`;
  const statusLine = `Status: ${review.status.toUpperCase()} - ${review.message}`;

  if (review.notams.length === 0) {
    return [
      sourceLine,
      locationLine,
      statusLine,
      review.status === 'manual-required'
        ? 'Halo prepared the route locations but did not retrieve NOTAM records. Obtain the official PIB through the linked official source before flight.'
        : 'No route-location NOTAM records are available in Halo for this briefing. Continue official preflight NOTAM review.',
    ];
  }

  return [
    sourceLine,
    locationLine,
    statusLine,
    ...review.notams.slice(0, 12).map(formatBriefingNotam),
    ...(review.notams.length > 12 ? [`+${review.notams.length - 12} more NOTAMs hidden in exported summary.`] : []),
  ];
}

function formatBriefingNotam(notam: RouteNotam): string {
  const period = [notam.effectiveFrom, notam.effectiveTo].filter(Boolean).join(' to ');
  return `${notam.severity.toUpperCase()}: ${notam.location} ${notam.id} ${notam.category}${period ? ` (${period})` : ''} - ${notam.text}`;
}

function formatBriefingWeightBalance(result?: WeightBalanceResult): string[] {
  if (!result) {
    return ['Status: UNCONFIGURED - W&B has not been calculated.'];
  }

  const lines = [
    `Status: ${getWeightBalanceStatusLabel(result.status).toUpperCase()} - ${result.message}`,
  ];

  for (const state of [result.ramp, result.takeoff, result.landing].filter(isWeightBalanceStateResult)) {
    lines.push(
      `${state.label.toUpperCase()}: ${Math.round(state.weightLb)} lb @ ${state.armIn.toFixed(2)} in CG` +
      `${state.forwardLimitIn !== undefined && state.aftLimitIn !== undefined ? ` (limits ${state.forwardLimitIn.toFixed(2)}-${state.aftLimitIn.toFixed(2)} in)` : ''}` +
      `${state.maxWeightLb !== undefined ? `, max ${Math.round(state.maxWeightLb)} lb` : ''}`
    );
  }

  if (result.issues.length > 0) {
    lines.push(...result.issues.map((issue) => `ISSUE: ${issue}`));
  }

  return lines;
}

function formatBriefingFreshness(dataFreshness: DataFreshness[]): string[] {
  if (dataFreshness.length === 0) {
    return ['Freshness metadata unavailable. Re-check official sources before flight.'];
  }

  return dataFreshness.map((item) =>
    `${item.status.toUpperCase()}: ${item.label}${item.updatedAt ? `, updated ${item.updatedAt}` : ''}`
  );
}

function formatAirspaceVerticalProfile(profile?: AirspaceVerticalProfile): string[] {
  if (!profile || profile.items.length === 0) {
    return ['No airspace profile bands available. Continue official chart review.'];
  }

  return [
    `Route distance: ${formatDistance(profile.routeDistanceNm)}, cruise altitude: ${Math.round(profile.cruiseAltitudeFt)} ft, status: ${profile.status.toUpperCase()}`,
    ...profile.items.slice(0, 12).map(formatAirspaceProfileItem),
    ...(profile.items.length > 12 ? [`+${profile.items.length - 12} more profile bands hidden in exported summary.`] : []),
  ];
}

function formatFuelPlanningResultLines(result?: FuelPlanningResult): string[] {
  if (!result) {
    return ['Fuel planning result unavailable. Configure an approved POH/AFM performance profile before trusting fuel numbers.'];
  }

  return [
    `Status: ${result.status.toUpperCase()} - ${result.message}`,
    `Rule set: ${result.ruleSet}, trusted: ${result.trusted ? 'yes' : 'no'}`,
    `Total required: ${formatFuelQuantity(result.totalRequiredFuel)}, remaining after final reserve: ${formatFuelQuantity(result.remainingFuel)}, expected landing: ${formatFuelQuantity(result.expectedLandingFuel)}`,
    ...result.breakdown.map((item) =>
      `${item.label}: ${formatFuelQuantity(item.quantity)}${item.trusted ? '' : ' untrusted'} - ${item.detail}`
    ),
    ...result.issues.map((issue) => `ISSUE: ${issue}`),
  ];
}

function formatAirspaceProfileItem(item: AirspaceVerticalProfileItem): string {
  const vertical = [item.lowerLimit ?? 'lower unknown', item.upperLimit ?? 'upper unknown'].join(' to ');
  return `${item.level.toUpperCase()}: ${item.name}, ${formatAirspaceDistanceRange(item)}, ${vertical}`;
}

function formatAirspaceDistanceRange(item: Pick<RouteAirspaceAlert, 'startDistanceNm' | 'endDistanceNm'>): string {
  if (item.startDistanceNm === undefined || item.endDistanceNm === undefined) {
    return 'route range unknown';
  }

  if (Math.abs(item.startDistanceNm - item.endDistanceNm) < 0.1) {
    return `near ${formatDistance(item.startDistanceNm)}`;
  }

  return `${formatDistance(item.startDistanceNm)}-${formatDistance(item.endDistanceNm)} along route`;
}

function formatTrainingNavLog(navLog?: TrainingNavLog): string[] {
  if (!navLog || navLog.legs.length === 0) {
    return ['No training navlog legs available. Add at least two waypoints and set route wind for checkride calculations.'];
  }

  return [
    `Route wind: ${Math.round(navLog.wind.directionDeg).toString().padStart(3, '0')} deg at ${Math.round(navLog.wind.speedKts)} kt`,
    `Totals: ${formatDuration(navLog.totalTimeMinutes)}, ${formatFuel(navLog.totalFuelGal)}`,
    `Formula: ${navLog.legs[0].formula}`,
    ...navLog.legs.map(formatTrainingNavLogLeg),
  ];
}

function formatTrainingNavLogLeg(leg: TrainingNavLogLeg, index: number): string {
  return `${index + 1}. ${leg.from} to ${leg.to}: ` +
    `TC ${formatCourse(leg.trueCourseDeg)}, MC ${formatCourse(leg.magneticCourseDeg)}, ` +
    `WCA ${formatSignedDegrees(leg.windCorrectionAngleDeg)}, TH ${formatCourse(leg.trueHeadingDeg)}, ` +
    `MH ${formatCourse(leg.magneticHeadingDeg)}, CH ${formatCourse(leg.compassHeadingDeg)}, ` +
    `GS ${Math.round(leg.groundSpeedKts)} kt, ETE ${formatDuration(leg.estimatedTimeMinutes)}, ` +
    `Fuel ${formatFuel(leg.fuelRequiredGal)}`;
}

function formatSignedDegrees(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded} deg`;
}

function isWeightBalanceStateResult(value: WeightBalanceStateResult | undefined): value is WeightBalanceStateResult {
  return Boolean(value);
}

function formatNotamReviewSource(source: RouteNotamReview['source']): string {
  if (source === 'south-africa-official') return 'South Africa official NOTAM briefing';
  if (source === 'faa-notam-api') return 'FAA NOTAM API';
  return 'Unavailable';
}

function formatNotamSummary(notams: RouteNotam[]): string {
  const visible = notams.slice(0, 5).map((notam) => `${notam.location} ${notam.category}`);
  const extra = notams.length > visible.length ? `; +${notams.length - visible.length} more` : '';
  return `${visible.join('; ')}${extra}`;
}
