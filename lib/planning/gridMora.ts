import type {
  Coordinates,
  GridMoraCell,
  GridMoraReview,
  GridMoraReviewSource,
  Waypoint,
} from '@/types/planning';

export interface GridMoraProvider {
  source: Exclude<GridMoraReviewSource, 'unavailable'>;
  sourceUrl: string;
  loadRouteCells: (waypoints: Waypoint[]) => Promise<GridMoraCell[]>;
}

const SOUTH_AFRICA_AIS_URL = 'https://www.caa.co.za/industry-information/aeronautical-information/';

export function buildDefaultGridMoraReview(waypoints: Waypoint[] = []): GridMoraReview {
  if (waypoints.length < 2) {
    return {
      source: 'unavailable',
      status: 'needs-route',
      message: 'Add at least two waypoints before checking Grid MORA.',
      cells: [],
      sourceUrl: SOUTH_AFRICA_AIS_URL,
    };
  }

  return {
    source: 'unavailable',
    status: 'provider-not-configured',
    message: 'Grid MORA requires licensed SACAA/ATNS, Jeppesen, Lido, NAVBLUE, or equivalent data. No provider is configured.',
    cells: [],
    routeSignature: buildGridMoraRouteSignature(waypoints),
    sourceUrl: SOUTH_AFRICA_AIS_URL,
    updatedAt: new Date().toISOString(),
  };
}

export async function reviewGridMoraForRoute(
  waypoints: Waypoint[],
  provider?: GridMoraProvider
): Promise<GridMoraReview> {
  if (waypoints.length < 2) {
    return buildDefaultGridMoraReview(waypoints);
  }

  if (!provider) {
    return buildDefaultGridMoraReview(waypoints);
  }

  try {
    const cells = await provider.loadRouteCells(waypoints);
    return {
      source: provider.source,
      sourceUrl: provider.sourceUrl,
      status: cells.length > 0 ? 'complete' : 'unavailable',
      message: cells.length > 0
        ? `${cells.length} provider-backed Grid MORA cell${cells.length === 1 ? '' : 's'} loaded for route review.`
        : 'Grid MORA provider returned no cells for the planned route.',
      cells,
      routeSignature: buildGridMoraRouteSignature(waypoints),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      source: provider.source,
      sourceUrl: provider.sourceUrl,
      status: 'unavailable',
      message: 'Configured Grid MORA provider is unavailable. Use official charts and briefing sources.',
      cells: [],
      routeSignature: buildGridMoraRouteSignature(waypoints),
      updatedAt: new Date().toISOString(),
    };
  }
}

export function buildGridMoraRouteSignature(waypoints: Waypoint[]): string {
  return waypoints
    .map((waypoint) => `${waypoint.ident ?? waypoint.name}:${waypoint.coordinates.map((value) => value.toFixed(5)).join(',')}`)
    .join('|');
}

export function normalizeGridMoraCell(input: GridMoraCell): GridMoraCell {
  return {
    ...input,
    bounds: normalizeBounds(input.bounds),
    moraFt: clampNumber(input.moraFt, 0, 60000),
    accuracy: input.accuracy === 'doubtful' ? 'doubtful' : 'normal',
    source: normalizeGridMoraSource(input.source),
  };
}

export function formatGridMoraReviewLines(review?: GridMoraReview): string[] {
  if (!review) {
    return ['Grid MORA not checked in Halo. Use official chart and briefing sources.'];
  }

  const lines = [
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    `Source: ${formatGridMoraSource(review.source)}${review.sourceUrl ? ` (${review.sourceUrl})` : ''}`,
  ];

  if (review.cells.length > 0) {
    lines.push(...review.cells.slice(0, 12).map((cell) =>
      `${cell.label}: ${Math.round(cell.moraFt)} ft${cell.accuracy === 'doubtful' ? ' accuracy doubtful' : ''}`
    ));
    if (review.cells.length > 12) {
      lines.push(`+${review.cells.length - 12} more Grid MORA cells hidden in exported summary.`);
    }
  }

  return lines;
}

export function formatGridMoraSource(source: GridMoraReviewSource): string {
  if (source === 'south-africa-official') return 'South Africa official aeronautical data';
  if (source === 'jeppesen') return 'Jeppesen aeronautical data';
  if (source === 'lido') return 'Lido aeronautical data';
  if (source === 'navblue') return 'NAVBLUE aeronautical data';
  return 'Unavailable';
}

function normalizeBounds(bounds: [Coordinates, Coordinates]): [Coordinates, Coordinates] {
  return [normalizeCoordinates(bounds[0]), normalizeCoordinates(bounds[1])];
}

function normalizeGridMoraSource(source: GridMoraReviewSource): GridMoraReviewSource {
  if (
    source === 'south-africa-official' ||
    source === 'jeppesen' ||
    source === 'lido' ||
    source === 'navblue'
  ) {
    return source;
  }
  return 'unavailable';
}

function normalizeCoordinates(coordinates: Coordinates): Coordinates {
  const longitude = clampNumber(coordinates[0], -180, 180);
  const latitude = clampNumber(coordinates[1], -90, 90);
  return [longitude, latitude];
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
