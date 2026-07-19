import type {
  AircraftProfile,
  BriefingRisk,
  PersonalMinimums,
  RouteAirspaceAlert,
  RouteAnalysis,
  RouteNotam,
  RouteNotamReview,
  Waypoint,
  WeatherReport,
  WeightBalanceResult,
} from '@/types/planning';
import { formatCourse, formatDistance, formatDuration, formatFuel } from './navigation';
import { isBelowPersonalMinimums } from './weather';
import { formatWeightBalanceStatus } from './weightBalance';

export function buildRiskAssessment(
  route: RouteAnalysis,
  weather: WeatherReport[],
  minimums: PersonalMinimums,
  routeAirspaceAlerts: RouteAirspaceAlert[] = [],
  routeNotamReview?: RouteNotamReview,
  weightBalanceResult?: WeightBalanceResult
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

  if (route.summary.fuelStatus === 'critical') {
    risks.push({
      id: 'fuel-critical',
      level: 'critical',
      title: route.summary.loadedFuelGal !== undefined
        ? 'Fuel exceeds loaded dispatch fuel'
        : 'Fuel exceeds usable capacity',
      detail: route.summary.loadedFuelGal !== undefined
        ? `Trip, reserve, and contingency fuel require ${formatFuel(route.summary.totalFuelRequiredGal)}, but loaded fuel after taxi is ${formatFuel(route.summary.dispatchFuelGal ?? 0)}.`
        : 'Trip, reserve, and contingency fuel are greater than the selected aircraft usable fuel.',
    });
  } else if (route.summary.fuelStatus === 'caution') {
    risks.push({
      id: 'fuel-caution',
      level: 'caution',
      title: 'Fuel margin is tight',
      detail: 'Fuel remaining after reserves is less than half of the reserve fuel quantity.',
    });
  }

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

  addNotamRisks(risks, routeNotamReview);
  addWeightBalanceRisks(risks, weightBalanceResult);

  if (risks.length === 0) {
    risks.push({
      id: 'route-ready',
      level: 'ok',
      title: 'Planning data consistent',
      detail: 'Route, fuel, available weather, airspace review, NOTAM review, and W&B review are internally consistent. Continue official preflight review before flight.',
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
  routeNotamReview?: RouteNotamReview;
  weightBalanceResult?: WeightBalanceResult;
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
    routeNotamReview,
    weightBalanceResult,
    departureTime,
    cruiseAltitudeFt,
    notes,
  } = params;

  const lines = [
    'HALO FLIGHT BRIEFING',
    `Generated: ${new Date().toISOString()}`,
    '',
    'FLIGHT SUMMARY',
    `Route: ${routeName || routeLabel(waypoints)}`,
    `Aircraft: ${aircraft.registration} ${aircraft.type} (${aircraft.name})`,
    `Departure time: ${departureTime || 'Not set'}`,
    `Cruise altitude: ${cruiseAltitudeFt ? `${cruiseAltitudeFt} ft` : 'Not set'}`,
    `Distance: ${formatDistance(route.summary.totalDistanceNm)}`,
    `ETE: ${formatDuration(route.summary.estimatedTimeMinutes)}`,
    `Fuel required: ${formatFuel(route.summary.totalFuelRequiredGal)}`,
    ...(route.summary.loadedFuelGal !== undefined
      ? [
          `Fuel loaded: ${formatFuel(route.summary.loadedFuelGal)}`,
          `Fuel after taxi: ${formatFuel(route.summary.dispatchFuelGal ?? 0)}`,
        ]
      : []),
    `Fuel remaining: ${formatFuel(route.summary.fuelRemainingGal)}`,
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
    'WEIGHT AND BALANCE',
    ...formatBriefingWeightBalance(weightBalanceResult),
    '',
    'RISK REVIEW',
    ...risks.map((risk) => `${risk.level.toUpperCase()}: ${risk.title} - ${risk.detail}`),
    '',
    'NOTAM REVIEW',
    ...formatBriefingNotamReview(routeNotamReview),
    '',
    'NOTES',
    notes || 'No pilot notes entered.',
  ];

  return lines.join('\n');
}

function routeLabel(waypoints: Waypoint[]): string {
  if (waypoints.length === 0) return 'Untitled route';
  return waypoints.map((waypoint) => waypoint.ident ?? waypoint.name).join(' -> ');
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
  return `${alert.level.toUpperCase()}: ${alert.name}${category ? ` (${category})` : ''}, ${vertical} - ${alert.reason}`;
}

function addNotamRisks(risks: BriefingRisk[], review?: RouteNotamReview) {
  if (!review || review.status === 'needs-route') {
    risks.push({
      id: 'notam-review',
      level: 'caution',
      title: 'NOTAM review required',
      detail: 'Add a route and complete official NOTAM review before treating the briefing as usable.',
    });
    return;
  }

  if (review.status === 'checking') {
    risks.push({
      id: 'notam-checking',
      level: 'caution',
      title: 'NOTAM review still checking',
      detail: 'Wait for route NOTAM review to finish before dispatch.',
    });
    return;
  }

  if (review.status === 'manual-required') {
    risks.push({
      id: 'notam-manual-required',
      level: 'caution',
      title: 'Official NOTAM briefing required',
      detail: review.message,
    });
    return;
  }

  if (review.status === 'unavailable') {
    risks.push({
      id: 'notam-unavailable',
      level: 'caution',
      title: 'NOTAM review unavailable',
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

function addWeightBalanceRisks(risks: BriefingRisk[], result?: WeightBalanceResult) {
  if (!result) {
    risks.push({
      id: 'wb-review',
      level: 'caution',
      title: 'Weight and balance review required',
      detail: 'Complete aircraft-specific weight and balance before treating the briefing as usable.',
    });
    return;
  }

  if (result.status === 'unconfigured' || result.status === 'incomplete') {
    risks.push({
      id: 'wb-incomplete',
      level: 'caution',
      title: 'Weight and balance not operational',
      detail: result.messages[0] ?? 'Enter aircraft-specific POH/AFM data before using W&B operationally.',
    });
    return;
  }

  if (result.status === 'out-of-limits') {
    risks.push({
      id: 'wb-critical',
      level: 'critical',
      title: 'Weight and balance out of limits',
      detail: result.messages[0] ?? 'One or more W&B phases are outside configured limits.',
    });
    return;
  }

  if (result.status === 'caution') {
    risks.push({
      id: 'wb-caution',
      level: 'caution',
      title: 'Weight and balance margin is tight',
      detail: result.messages[0] ?? 'One or more W&B phases are close to configured limits.',
    });
  }
}

function formatBriefingNotamReview(review?: RouteNotamReview): string[] {
  if (!review) {
    return ['Live NOTAM review has not run. Check the official NOTAM source before flight.'];
  }

  const sourceLine = `Source: ${formatNotamSource(review.source)} (${review.sourceUrl})`;
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
      'No route-location NOTAM records are available in Halo for this briefing. Continue official preflight NOTAM review.',
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

function formatBriefingWeightBalance(result?: WeightBalanceResult): string[] {
  if (!result) {
    return ['Weight and balance has not been calculated.'];
  }

  const lines = [
    `Status: ${formatWeightBalanceStatus(result.status)}`,
    ...result.phases.map((phase) => {
      const arm = phase.armIn !== undefined ? `${phase.armIn.toFixed(2)} in` : 'unknown arm';
      const limits = phase.forwardLimitIn !== undefined && phase.aftLimitIn !== undefined
        ? `limits ${phase.forwardLimitIn.toFixed(2)}-${phase.aftLimitIn.toFixed(2)} in`
        : 'limits unavailable';
      return `${phase.phase.toUpperCase()}: ${Math.round(phase.weightLb)} lb, CG ${arm}, ${limits}, ${formatWeightBalanceStatus(phase.status)}`;
    }),
    ...result.messages.slice(0, 5),
  ];

  return lines;
}

function formatNotamSource(source: RouteNotamReview['source']): string {
  if (source === 'faa-notam-api') return 'FAA NOTAM API';
  if (source === 'south-africa-official') return 'South Africa official briefing';
  return 'Unavailable';
}

function formatBriefingNotam(notam: RouteNotam): string {
  const period = [notam.effectiveFrom, notam.effectiveTo].filter(Boolean).join(' to ');
  return `${notam.severity.toUpperCase()}: ${notam.location} ${notam.id} ${notam.category}${period ? ` (${period})` : ''} - ${notam.text}`;
}

function formatNotamSummary(notams: RouteNotam[]): string {
  const visible = notams.slice(0, 5).map((notam) => `${notam.location} ${notam.category}`);
  const extra = notams.length > visible.length ? `; +${notams.length - visible.length} more` : '';
  return `${visible.join('; ')}${extra}`;
}
