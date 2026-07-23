export interface ScreenPoint {
  x: number;
  y: number;
}

export const ROUTE_WAYPOINT_TAP_TOLERANCE_PX = 8;

export type PlanningMapClickAction =
  | { kind: 'plot-waypoint' }
  | { kind: 'select-waypoint'; waypointId: string };

export function getPlanningMapClickAction(routeWaypointId: string | null | undefined): PlanningMapClickAction {
  return routeWaypointId
    ? { kind: 'select-waypoint', waypointId: routeWaypointId }
    : { kind: 'plot-waypoint' };
}

export function getActiveTouchCount(event: unknown): number {
  if (!event || typeof event !== 'object' || !('originalEvent' in event)) return 0;

  const originalEvent = (event as { originalEvent?: unknown }).originalEvent;
  if (!originalEvent || typeof originalEvent !== 'object' || !('touches' in originalEvent)) return 0;

  const touches = (originalEvent as { touches?: { length?: unknown } }).touches;
  return typeof touches?.length === 'number' && Number.isFinite(touches.length)
    ? Math.max(0, touches.length)
    : 0;
}

export function isMultiTouchGesture(event: unknown): boolean {
  return getActiveTouchCount(event) > 1;
}

export function normalizeScreenPoint(point: unknown): ScreenPoint | null {
  if (Array.isArray(point)) {
    const [x, y] = point;
    return isFiniteNumber(x) && isFiniteNumber(y) ? { x, y } : null;
  }

  if (!point || typeof point !== 'object') return null;

  const candidate = point as { x?: unknown; y?: unknown };
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y)
    ? { x: candidate.x, y: candidate.y }
    : null;
}

export function didPointerDrag(
  start: ScreenPoint | null,
  current: ScreenPoint | null,
  alreadyMoved = false,
  tolerancePx = ROUTE_WAYPOINT_TAP_TOLERANCE_PX
): boolean {
  if (alreadyMoved) return true;
  if (!start || !current) return false;

  const tolerance = Number.isFinite(tolerancePx) ? Math.max(0, tolerancePx) : ROUTE_WAYPOINT_TAP_TOLERANCE_PX;
  return Math.hypot(current.x - start.x, current.y - start.y) > tolerance;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
