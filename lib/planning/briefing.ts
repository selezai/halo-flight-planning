import type {
  AircraftProfile,
  BriefingRisk,
  PersonalMinimums,
  RouteAirspaceAlert,
  RouteAnalysis,
  Waypoint,
  WeatherReport,
} from '@/types/planning';
import { formatCourse, formatDistance, formatDuration, formatFuel } from './navigation';
import { isBelowPersonalMinimums } from './weather';

export function buildRiskAssessment(
  route: RouteAnalysis,
  weather: WeatherReport[],
  minimums: PersonalMinimums,
  routeAirspaceAlerts: RouteAirspaceAlert[] = []
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

  risks.push({
    id: 'notam-review',
    level: 'caution',
    title: 'NOTAM review required',
    detail: 'Halo highlights the check, but a validated live NOTAM feed is not configured in this local release.',
  });

  if (risks.length === 1 && risks[0].id === 'notam-review') {
    return [
      {
        id: 'route-ready',
        level: 'ok',
        title: 'Planning data consistent',
        detail: 'Route, fuel, and available weather are internally consistent. Complete the external NOTAM check.',
      },
      risks[0],
    ];
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
    'RISK REVIEW',
    ...risks.map((risk) => `${risk.level.toUpperCase()}: ${risk.title} - ${risk.detail}`),
    '',
    'NOTAM REVIEW',
    'Check the official NOTAM source for departure, destination, alternates, FIRs, route corridor, procedures, and temporary airspace before flight.',
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
