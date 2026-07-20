import type {
  AirspaceVerticalProfile,
  AirspaceVerticalProfileItem,
  RouteAirspaceAlert,
  RouteAnalysis,
} from '@/types/planning';

export function buildAirspaceVerticalProfile(
  route: RouteAnalysis,
  alerts: RouteAirspaceAlert[],
  cruiseAltitudeFt: number
): AirspaceVerticalProfile {
  const routeDistanceNm = route.summary.totalDistanceNm;
  const items = alerts.map((alert): AirspaceVerticalProfileItem => ({
    id: alert.id,
    name: alert.name,
    level: alert.level,
    lowerLimit: alert.lowerLimit,
    upperLimit: alert.upperLimit,
    lowerLimitFt: alert.lowerLimitFt,
    upperLimitFt: alert.upperLimitFt,
    cruiseAltitudeFt,
    conflict: alert.conflict,
    requiresReview: alert.requiresReview,
    ...normalizeRange(alert, routeDistanceNm),
  }));
  const status = items.some((item) => item.level === 'critical')
    ? 'critical'
    : items.some((item) => item.requiresReview || item.level === 'caution')
      ? 'review'
      : 'clear';

  return {
    routeDistanceNm,
    cruiseAltitudeFt,
    status,
    items,
  };
}

function normalizeRange(
  alert: RouteAirspaceAlert,
  routeDistanceNm: number
): Pick<AirspaceVerticalProfileItem, 'startDistanceNm' | 'endDistanceNm'> {
  const start = finiteNumber(alert.startDistanceNm);
  const end = finiteNumber(alert.endDistanceNm);

  if (start === undefined && end === undefined) {
    return {};
  }

  const clampedStart = clampDistance(start ?? end ?? 0, routeDistanceNm);
  const clampedEnd = clampDistance(end ?? start ?? clampedStart, routeDistanceNm);

  return {
    startDistanceNm: Math.min(clampedStart, clampedEnd),
    endDistanceNm: Math.max(clampedStart, clampedEnd),
  };
}

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clampDistance(distanceNm: number, routeDistanceNm: number): number {
  return Math.max(0, Math.min(Math.max(0, routeDistanceNm), distanceNm));
}
