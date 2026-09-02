import type {
  AircraftProfile,
  Coordinates,
  FuelPlanningResult,
  RouteCandidate,
  RouteIntelligenceReview,
  RouteToken,
  Waypoint,
} from '@/types/planning';
import { formatDistance, formatDuration, calculateRoute } from './navigation';
import { parseRouteInputItems } from './routeInput';

const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const ROUTE_SEPARATOR_RE = /(?:->|\u2192|;|\n|\/)/g;
const IDENTIFIER_RE = /^[A-Z0-9][A-Z0-9-]{1,11}$/;
const AIRWAY_RE = /^(?:U?[A-Z]{1,3})\d{1,4}[A-Z]?$/;
const PROCEDURE_RE = /^(?:SID|STAR|APCH|APP|ILS|RNAV|RNP|VOR|NDB)(?:[-A-Z0-9]*)?$|^[A-Z0-9-]+(?:SID|STAR|APCH|APP)$|^[A-Z]{4,6}\d[A-Z]$/;
const FLIGHT_LEVEL_RE = /^FL(\d{2,3})$/;
const ALTITUDE_RE = /^(?:ALT)?(\d{3,5})FT$|^[AF](\d{2,3})$/;

export interface BuildRouteIntelligenceReviewParams {
  waypoints: Waypoint[];
  aircraft: AircraftProfile;
  typedRoute?: string;
  providerConfigured?: boolean;
  selectedCandidateId?: string;
  currentFuelPlanningResult?: FuelPlanningResult;
  providerCandidate?: RouteCandidate;
  now?: Date;
}

export function parseRouteIntelligenceTokens(input: string): RouteToken[] {
  const trimmed = input.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return [];

  const rawTokens = trimmed
    .replace(/\r\n?/g, '\n')
    .replace(ROUTE_SEPARATOR_RE, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const tokens: RouteToken[] = [];

  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index];
    const next = rawTokens[index + 1];
    const coordinate = parseCoordinateToken(current) ?? (next ? parseCoordinateToken(`${current} ${next}`) : null);

    if (coordinate) {
      tokens.push({
        kind: 'coordinate',
        source: next && coordinate.source.includes(next) ? `${current} ${next}` : current,
        coordinates: coordinate.coordinates,
        requiresProvider: false,
      });
      if (next && coordinate.source.includes(next)) index += 1;
      continue;
    }

    const normalized = current.replace(/,$/, '').toUpperCase();
    if (normalized === 'DCT' || normalized === 'DIRECT') {
      tokens.push({
        kind: 'direct',
        source: current,
        query: 'DCT',
        requiresProvider: false,
      });
      continue;
    }

    const altitudeFt = parseAltitudeFt(normalized);
    if (altitudeFt !== null) {
      tokens.push({
        kind: 'altitude',
        source: current,
        altitudeFt,
        requiresProvider: false,
      });
      continue;
    }

    if (PROCEDURE_RE.test(normalized)) {
      tokens.push({
        kind: 'procedure',
        source: current,
        query: normalized,
        requiresProvider: true,
      });
      continue;
    }

    if (AIRWAY_RE.test(normalized)) {
      tokens.push({
        kind: 'airway',
        source: current,
        query: normalized,
        requiresProvider: true,
      });
      continue;
    }

    if (IDENTIFIER_RE.test(normalized)) {
      tokens.push({
        kind: 'waypoint',
        source: current,
        query: normalized,
        requiresProvider: false,
      });
    }
  }

  return tokens;
}

export function buildRouteIntelligenceReview({
  waypoints,
  aircraft,
  typedRoute = '',
  providerConfigured = false,
  selectedCandidateId,
  currentFuelPlanningResult,
  providerCandidate,
  now = new Date(),
}: BuildRouteIntelligenceReviewParams): RouteIntelligenceReview {
  const tokens = parseRouteIntelligenceTokens(typedRoute);
  const providerRequired = tokens.some((token) => token.requiresProvider);
  const candidates: RouteCandidate[] = [];

  if (waypoints.length < 2) {
    candidates.push(createUnavailableCandidate('direct-route', 'Direct', 'direct', 'needs-route', 'Add at least two waypoints to compare route options.'));
    candidates.push(createUnavailableCandidate('current-route', 'Current/User Route', 'current', 'needs-route', 'Add at least two waypoints to compare the current route.'));
  } else {
    const directWaypoints = [waypoints[0], waypoints[waypoints.length - 1]];
    const directRoute = calculateRoute(directWaypoints, aircraft);
    const currentRoute = calculateRoute(waypoints, aircraft);

    candidates.push(createRouteCandidate({
      id: 'direct-route',
      title: 'Direct',
      source: 'direct',
      waypoints: directWaypoints,
      distanceNm: directRoute.summary.totalDistanceNm,
      estimatedTimeMinutes: directRoute.summary.estimatedTimeMinutes,
      warnings: providerRequired
        ? ['Typed airway/procedure tokens were not expanded in the local direct route.']
        : [],
    }));

    candidates.push(createRouteCandidate({
      id: 'current-route',
      title: 'Current/User Route',
      source: 'current',
      waypoints,
      distanceNm: currentRoute.summary.totalDistanceNm,
      estimatedTimeMinutes: currentRoute.summary.estimatedTimeMinutes,
      totalFuelRequired: currentFuelPlanningResult?.totalRequiredFuel,
      remainingFuel: currentFuelPlanningResult?.remainingFuel,
      warnings: providerRequired && !providerConfigured
        ? ['Airway/procedure-looking tokens need licensed navdata before Halo can validate or expand them.']
        : [],
    }));
  }

  candidates.push(resolveProviderCandidate(providerConfigured, providerCandidate, providerRequired));

  const selectedId = selectedCandidateId && candidates.some((candidate) => candidate.id === selectedCandidateId)
    ? selectedCandidateId
    : undefined;
  const status = waypoints.length < 2
    ? 'needs-route'
    : providerRequired && !providerConfigured
      ? 'provider-not-configured'
      : 'ready';

  return {
    status,
    message: buildReviewMessage(status, tokens, providerConfigured),
    tokens,
    candidates,
    providerConfigured,
    selectedCandidateId: selectedId,
    updatedAt: now.toISOString(),
  };
}

export function routeCandidateLabel(candidate: RouteCandidate): string {
  const metrics = [
    candidate.totalDistanceNm !== undefined ? formatDistance(candidate.totalDistanceNm) : undefined,
    candidate.estimatedTimeMinutes !== undefined ? formatDuration(candidate.estimatedTimeMinutes) : undefined,
  ].filter(Boolean);
  return metrics.length ? `${candidate.title} (${metrics.join(', ')})` : candidate.title;
}

export function formatRouteIntelligenceReviewLines(review?: RouteIntelligenceReview): string[] {
  if (!review) {
    return ['Route intelligence review unavailable. Use manual route review and official sources before dispatch.'];
  }

  const lines = [
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    `Licensed provider configured: ${review.providerConfigured ? 'yes' : 'no'}`,
    `Selected candidate: ${review.selectedCandidateId ?? 'none'}`,
  ];

  if (review.tokens.length > 0) {
    lines.push(`Typed tokens: ${review.tokens.map(formatToken).join('; ')}`);
  } else {
    lines.push('Typed tokens: none');
  }

  for (const candidate of review.candidates) {
    lines.push(`${candidate.title}: ${candidate.status.toUpperCase()} - ${candidate.message}`);
    if (candidate.warnings.length > 0) {
      lines.push(...candidate.warnings.map((warning) => `WARNING: ${warning}`));
    }
  }

  return lines;
}

function resolveProviderCandidate(
  providerConfigured: boolean,
  providerCandidate: RouteCandidate | undefined,
  providerRequired: boolean
): RouteCandidate {
  if (providerConfigured && providerCandidate) {
    return {
      ...providerCandidate,
      source: 'licensed-provider',
      warnings: providerCandidate.warnings,
    };
  }

  if (providerConfigured) {
    return createUnavailableCandidate(
      'provider-route',
      'Provider Route',
      'licensed-provider',
      'unavailable',
      'Licensed navdata provider is configured but did not return a route candidate.'
    );
  }

  return createUnavailableCandidate(
    'provider-route',
    'Provider Route',
    'licensed-provider',
    'provider-not-configured',
    providerRequired
      ? 'Licensed navdata is required for airway/procedure routing; configure a provider before using this option.'
      : 'Licensed navdata provider is not configured; official preferred routes, airways, SIDs, STARs, and approaches are unavailable in Halo.'
  );
}

function createRouteCandidate(params: {
  id: string;
  title: string;
  source: RouteCandidate['source'];
  waypoints: Waypoint[];
  distanceNm: number;
  estimatedTimeMinutes: number;
  totalFuelRequired?: RouteCandidate['totalFuelRequired'];
  remainingFuel?: RouteCandidate['remainingFuel'];
  warnings?: string[];
}): RouteCandidate {
  return {
    id: params.id,
    title: params.title,
    source: params.source,
    status: 'available',
    message: `${formatDistance(params.distanceNm)} and ${formatDuration(params.estimatedTimeMinutes)} using local waypoint geometry.`,
    waypoints: params.waypoints,
    totalDistanceNm: params.distanceNm,
    estimatedTimeMinutes: params.estimatedTimeMinutes,
    totalFuelRequired: params.totalFuelRequired,
    remainingFuel: params.remainingFuel,
    warnings: params.warnings ?? [],
  };
}

function createUnavailableCandidate(
  id: string,
  title: string,
  source: RouteCandidate['source'],
  status: RouteCandidate['status'],
  message: string
): RouteCandidate {
  return {
    id,
    title,
    source,
    status,
    message,
    waypoints: [],
    warnings: [],
  };
}

function buildReviewMessage(
  status: RouteIntelligenceReview['status'],
  tokens: RouteToken[],
  providerConfigured: boolean
): string {
  if (status === 'needs-route') return 'Add at least two route waypoints to compare route candidates.';
  if (status === 'provider-not-configured') {
    return 'Local route candidates are available, but airway/procedure/provider routing needs licensed navdata.';
  }
  const providerMessage = providerConfigured
    ? 'Licensed provider routing is available through the configured boundary.'
    : 'Provider routing is gated until licensed navdata is configured.';
  const tokenMessage = tokens.length
    ? `${tokens.length} typed route token${tokens.length === 1 ? '' : 's'} reviewed.`
    : 'No typed route tokens entered.';
  return `${tokenMessage} ${providerMessage}`;
}

function parseCoordinateToken(source: string): { source: string; coordinates: Coordinates } | null {
  const parsed = parseRouteInputItems(source);
  if (parsed.items.length !== 1 || parsed.items[0].kind !== 'coordinate') return null;
  return {
    source,
    coordinates: parsed.items[0].coordinates,
  };
}

function parseAltitudeFt(token: string): number | null {
  const flightLevel = FLIGHT_LEVEL_RE.exec(token);
  if (flightLevel) {
    const value = Number(flightLevel[1]) * 100;
    return Number.isFinite(value) ? value : null;
  }

  const altitude = ALTITUDE_RE.exec(token);
  const rawValue = altitude?.[1] ?? altitude?.[2];
  if (!rawValue) return null;

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return null;
  return rawValue.length <= 3 ? numeric * 100 : numeric;
}

function formatToken(token: RouteToken): string {
  if (token.kind === 'coordinate' && token.coordinates) {
    return `${token.source} coordinate`;
  }
  if (token.kind === 'altitude' && token.altitudeFt !== undefined) {
    return `${token.source} altitude ${Math.round(token.altitudeFt)} ft`;
  }
  return `${token.source} ${token.kind}${token.requiresProvider ? ' requires provider' : ''}`;
}
