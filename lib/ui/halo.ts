import type {
  DataFreshness,
  FlightAdminReview,
  RouteAirspaceReview,
  RouteAnalysis,
  RouteNotamReview,
  Waypoint,
  WeightBalanceResult,
} from '@/types/planning';
import { formatDistance, formatDuration, formatFuel } from '@/lib/planning/navigation';
import { getWeightBalanceStatusLabel } from '@/lib/planning/weightBalance';

export type HaloPanelId = 'route' | 'weather' | 'aircraft' | 'briefing' | 'admin' | 'emergency';

export type HaloStatusTone = 'idle' | 'ready' | 'review' | 'stop';

export interface HaloMissionSummary {
  status: HaloStatusTone;
  title: string;
  detail: string;
  primaryAction: string;
  routeLabel: string;
  fuelLabel: string;
  airspaceLabel: string;
  notamLabel: string;
  weightBalanceLabel: string;
  adminLabel: string;
  freshnessLabel: string;
}

export interface HaloNavigationItem {
  id: HaloPanelId;
  label: string;
  shortLabel: string;
  description: string;
}

export const HALO_NAVIGATION_ITEMS: HaloNavigationItem[] = [
  {
    id: 'route',
    label: 'Route',
    shortLabel: 'Route',
    description: 'Build and refine the route, waypoints, legs, and route timeline.',
  },
  {
    id: 'weather',
    label: 'Weather',
    shortLabel: 'Wx',
    description: 'Review METAR, TAF, categories, winds, ceilings, and visibility.',
  },
  {
    id: 'aircraft',
    label: 'Aircraft + W&B',
    shortLabel: 'W&B',
    description: 'Select aircraft, configure POH data, and verify loading limits.',
  },
  {
    id: 'briefing',
    label: 'Briefing',
    shortLabel: 'Brief',
    description: 'Read the pilot digest, risk review, freshness, and export package.',
  },
  {
    id: 'admin',
    label: 'Flight Admin',
    shortLabel: 'Admin',
    description: 'Record optional NOTAM/FPL handoff details and close reminders.',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    shortLabel: 'Emerg',
    description: 'Plan glide range and forced-landing options.',
  },
];

const HALO_PANEL_IDS = new Set<HaloPanelId>(
  HALO_NAVIGATION_ITEMS.map((item) => item.id)
);

export function normalizeHaloPanelId(value: unknown): HaloPanelId {
  if (value === 'research') return 'briefing';
  if (value === 'feature') return 'route';
  if (typeof value === 'string' && HALO_PANEL_IDS.has(value as HaloPanelId)) {
    return value as HaloPanelId;
  }

  return 'route';
}

export function buildHaloMissionSummary(params: {
  route: RouteAnalysis;
  waypoints: Waypoint[];
  routeName?: string;
  airspaceReview?: RouteAirspaceReview;
  notamReview?: RouteNotamReview;
  weightBalanceResult?: WeightBalanceResult;
  dataFreshness?: DataFreshness[];
  flightAdminReview?: FlightAdminReview;
}): HaloMissionSummary {
  const routeLabel = formatRouteLabel(params.route, params.waypoints);
  const fuelLabel = formatFuelLabel(params.route);
  const airspaceLabel = formatAirspaceLabel(params.airspaceReview);
  const notamLabel = formatNotamLabel(params.notamReview, params.flightAdminReview);
  const weightBalanceLabel = formatWeightBalanceLabel(params.weightBalanceResult);
  const adminLabel = formatAdminLabel(params.flightAdminReview);
  const freshnessLabel = formatFreshnessLabel(params.dataFreshness);
  const status = deriveMissionStatus(params);

  return {
    status,
    title: formatMissionTitle(status, params.routeName),
    detail: formatMissionDetail(status, params),
    primaryAction: formatMissionPrimaryAction(status, params),
    routeLabel,
    fuelLabel,
    airspaceLabel,
    notamLabel,
    weightBalanceLabel,
    adminLabel,
    freshnessLabel,
  };
}

function deriveMissionStatus(params: {
  route: RouteAnalysis;
  waypoints: Waypoint[];
  airspaceReview?: RouteAirspaceReview;
  notamReview?: RouteNotamReview;
  weightBalanceResult?: WeightBalanceResult;
  dataFreshness?: DataFreshness[];
  flightAdminReview?: FlightAdminReview;
}): HaloStatusTone {
  if (params.route.summary.legCount === 0 || params.waypoints.length < 2) {
    return 'idle';
  }

  if (
    params.route.summary.fuelStatus === 'critical' ||
    params.weightBalanceResult?.status === 'out-of-limits' ||
    params.airspaceReview?.alerts.some((alert) => alert.level === 'critical') ||
    params.flightAdminReview?.status === 'stop'
  ) {
    return 'stop';
  }

  if (
    params.route.summary.fuelStatus === 'caution' ||
    isWeightBalanceReviewState(params.weightBalanceResult) ||
    isAirspaceReviewState(params.airspaceReview) ||
    isNotamReviewState(params.notamReview) ||
    params.dataFreshness?.some((item) => item.status !== 'current') ||
    params.flightAdminReview?.status === 'review'
  ) {
    return 'review';
  }

  return 'ready';
}

function isWeightBalanceReviewState(result: WeightBalanceResult | undefined): boolean {
  if (!result) return true;
  return result.status !== 'within-limits';
}

function isAirspaceReviewState(review: RouteAirspaceReview | undefined): boolean {
  if (!review) return true;
  if (review.alerts.some((alert) => alert.requiresReview || alert.level === 'caution')) return true;
  return review.status !== 'complete';
}

function isNotamReviewState(review: RouteNotamReview | undefined): boolean {
  if (!review) return true;
  if (review.status === 'manual-required' || review.status === 'needs-route') return false;
  return review.status !== 'complete';
}

function formatMissionTitle(status: HaloStatusTone, routeName: string | undefined): string {
  const name = routeName?.trim() || 'Mission';
  const labels: Record<HaloStatusTone, string> = {
    idle: 'Plan a new mission',
    ready: `${name} ready`,
    review: `${name} needs review`,
    stop: `${name} has stop items`,
  };

  return labels[status];
}

function formatMissionDetail(
  status: HaloStatusTone,
  params: {
    route: RouteAnalysis;
    waypoints: Waypoint[];
    dataFreshness?: DataFreshness[];
  }
): string {
  if (status === 'idle') {
    return 'Start with a departure and destination. Halo keeps the map primary while the Planner collects the pilot actions.';
  }

  const routeDetail = `${params.waypoints.length} waypoint${params.waypoints.length === 1 ? '' : 's'}, ${formatDistance(params.route.summary.totalDistanceNm)}, ${formatDuration(params.route.summary.estimatedTimeMinutes)}`;

  if (status === 'stop') {
    return `${routeDetail}. Resolve red fuel, W&B, airspace, or admin items before treating this plan as usable.`;
  }

  if (status === 'review') {
    const staleCount = params.dataFreshness?.filter((item) => item.status !== 'current').length ?? 0;
    return staleCount > 0
      ? `${routeDetail}. ${staleCount} data source${staleCount === 1 ? '' : 's'} must be reviewed before departure.`
      : `${routeDetail}. Amber pilot checks remain before dispatch.`;
  }

  return `${routeDetail}. Fuel, W&B, airspace, and freshness checks are currently green in Halo.`;
}

function formatMissionPrimaryAction(
  status: HaloStatusTone,
  params: {
    route: RouteAnalysis;
    weightBalanceResult?: WeightBalanceResult;
    flightAdminReview?: FlightAdminReview;
  }
): string {
  if (status === 'idle') return 'Start route';
  if (params.route.summary.fuelStatus === 'critical') return 'Fix fuel plan';
  if (params.weightBalanceResult?.status === 'out-of-limits') return 'Fix W&B';
  if (params.flightAdminReview?.status === 'stop') return 'Resolve admin';
  if (status === 'review') return 'Open briefing';
  return 'Export backup pack';
}

function formatRouteLabel(route: RouteAnalysis, waypoints: Waypoint[]): string {
  if (route.summary.legCount === 0) return 'No route';

  const departure = waypoints[0];
  const destination = waypoints.at(-1);
  const routeName = [departure, destination]
    .map((waypoint) => waypoint?.ident ?? waypoint?.name)
    .filter(Boolean)
    .join(' → ');

  return `${routeName || 'Route'} · ${formatDistance(route.summary.totalDistanceNm)} · ${formatDuration(route.summary.estimatedTimeMinutes)}`;
}

function formatFuelLabel(route: RouteAnalysis): string {
  const status = route.summary.fuelStatus.toUpperCase();
  return `${status} · ${formatFuel(route.summary.totalFuelRequiredGal)} required · ${formatFuel(route.summary.fuelRemainingGal)} remaining`;
}

function formatAirspaceLabel(review: RouteAirspaceReview | undefined): string {
  if (!review) return 'Airspace unknown';
  const critical = review.alerts.filter((alert) => alert.level === 'critical').length;
  const reviewCount = review.alerts.filter((alert) => alert.requiresReview || alert.level === 'caution').length;

  if (critical > 0) return `${critical} critical airspace item${critical === 1 ? '' : 's'}`;
  if (reviewCount > 0) return `${reviewCount} airspace item${reviewCount === 1 ? '' : 's'} need review`;
  if (review.status === 'complete') return 'Airspace review complete';
  return `Airspace ${review.status.replace(/-/g, ' ')}`;
}

function formatNotamLabel(
  review: RouteNotamReview | undefined,
  adminReview: FlightAdminReview | undefined
): string {
  if (adminReview?.notamStatus === 'completed') return 'Official NOTAM recorded';
  if (adminReview?.notamStatus === 'needs-rebrief') return 'NOTAM needs rebrief';
  if (!review) return 'NOTAM status unknown';
  if (review.source === 'south-africa-official') return 'Official SA NOTAM handoff prepared';
  if (review.status === 'complete') return `${review.notams.length} NOTAM${review.notams.length === 1 ? '' : 's'} returned`;
  return `NOTAM ${review.status.replace(/-/g, ' ')}`;
}

function formatWeightBalanceLabel(result: WeightBalanceResult | undefined): string {
  if (!result) return 'W&B unknown';
  return `${getWeightBalanceStatusLabel(result.status)} · ${result.message}`;
}

function formatAdminLabel(review: FlightAdminReview | undefined): string {
  if (!review) return 'Admin optional';
  if (review.status === 'stop') return `Admin stop · ${review.message}`;
  if (review.status === 'review') return `Admin review · ${review.message}`;
  return `Admin ready · ${review.message}`;
}

function formatFreshnessLabel(freshness: DataFreshness[] | undefined): string {
  if (!freshness?.length) return 'Freshness unknown';

  const staleCount = freshness.filter((item) => item.status === 'stale').length;
  const unknownCount = freshness.filter((item) => item.status === 'unknown').length;

  if (staleCount > 0 || unknownCount > 0) {
    return `${staleCount} stale · ${unknownCount} unknown`;
  }

  return 'All tracked data current';
}
