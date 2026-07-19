import type { ParsedFeature } from '@/types/openaip';
import type { RouteAirspaceAlert, RouteAirspaceAlertLevel } from '@/types/planning';

const CONTROLLED_OR_SPECIAL_USE_PATTERN =
  /\b(class [abcd]|restricted|danger|prohibited|ctr|control zone|tma|atz|adiz|tmz|rmz|tra|tsa|tfr|temporary flight restriction|special use)\b/i;

const LEVEL_RANK: Record<RouteAirspaceAlertLevel, number> = {
  critical: 0,
  caution: 1,
  info: 2,
};

export function buildRouteAirspaceAlert(
  feature: ParsedFeature,
  cruiseAltitudeFt: number,
  options: {
    relationship?: RouteAirspaceAlert['relationship'];
    distanceNm?: number;
  } = {}
): RouteAirspaceAlert | null {
  if (feature.type !== 'airspace') return null;

  const name = feature.name || feature.sourceId || 'Unnamed airspace';
  const lowerLimitFt = finiteNumber(feature.lowerLimitFt);
  const upperLimitFt = finiteNumber(feature.upperLimitFt);
  const hasVerticalLimits = lowerLimitFt !== undefined || upperLimitFt !== undefined;
  const conflict = hasVerticalLimits
    ? isAltitudeWithinLimits(cruiseAltitudeFt, lowerLimitFt, upperLimitFt)
    : false;

  let level: RouteAirspaceAlertLevel = 'info';
  let requiresReview = false;
  const relationship = options.relationship ?? 'crossing';
  const routeText = formatRouteRelationship(name, relationship, options.distanceNm);
  let reason = `${routeText}, but ${formatAltitude(cruiseAltitudeFt)} is outside the parsed vertical limits.`;

  if (!hasVerticalLimits) {
    level = 'caution';
    requiresReview = true;
    reason = `${routeText} and Halo could not parse comparable vertical limits from the OpenAIP feature.`;
  } else if (conflict) {
    requiresReview = true;
    level = isControlledOrSpecialUse(feature) ? 'critical' : 'caution';
    reason = `${formatAltitude(cruiseAltitudeFt)} is inside ${name}'s parsed vertical band.`;
  }

  return {
    id: getAirspaceAlertKey(feature),
    name,
    sourceId: feature.sourceId,
    airspaceType: feature.airspaceType,
    airspaceClass: feature.airspaceClass,
    lowerLimit: feature.lowerLimit,
    upperLimit: feature.upperLimit,
    lowerLimitFt,
    upperLimitFt,
    cruiseAltitudeFt,
    conflict,
    requiresReview,
    level,
    reason,
    relationship,
    distanceNm: options.distanceNm,
  };
}

export function sortRouteAirspaceAlerts(alerts: RouteAirspaceAlert[]): RouteAirspaceAlert[] {
  return [...alerts].sort((a, b) => {
    const levelDifference = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
    if (levelDifference !== 0) return levelDifference;
    if (a.conflict !== b.conflict) return a.conflict ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function getAirspaceAlertKey(feature: ParsedFeature): string {
  return [
    feature.sourceId,
    feature.name,
    feature.airspaceType,
    feature.airspaceClass,
    feature.lowerLimit,
    feature.upperLimit,
  ]
    .filter(Boolean)
    .join('|') || 'unknown-airspace';
}

export function isAltitudeWithinLimits(
  altitudeFt: number,
  lowerLimitFt?: number,
  upperLimitFt?: number
): boolean {
  const lower = lowerLimitFt ?? Number.NEGATIVE_INFINITY;
  const upper = upperLimitFt ?? Number.POSITIVE_INFINITY;
  return altitudeFt >= lower && altitudeFt <= upper;
}

function isControlledOrSpecialUse(feature: ParsedFeature): boolean {
  const labels = [feature.airspaceType, feature.airspaceClass, feature.name].filter(Boolean).join(' ');
  return CONTROLLED_OR_SPECIAL_USE_PATTERN.test(labels);
}

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function formatAltitude(altitudeFt: number): string {
  return `${Math.round(altitudeFt).toLocaleString('en-US')} ft`;
}

function formatRouteRelationship(
  name: string,
  relationship: RouteAirspaceAlert['relationship'],
  distanceNm: number | undefined
): string {
  if (relationship === 'corridor') {
    const distance = typeof distanceNm === 'number' && Number.isFinite(distanceNm)
      ? `${distanceNm.toFixed(1)} nm from`
      : 'near';
    return `${name} is ${distance} the planned route corridor`;
  }

  return `${name} is crossed`;
}
