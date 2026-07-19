import type { Waypoint } from '@/types/planning';

export function mergeWaypointResults(...groups: Waypoint[][]): Waypoint[] {
  const seen = new Set<string>();
  const merged: Waypoint[] = [];

  for (const waypoint of groups.flat()) {
    const key = waypointResultKey(waypoint);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(waypoint);
  }

  return merged;
}

export function waypointResultKey(waypoint: Waypoint): string {
  if (waypoint.ident) {
    return `${waypoint.type}|${waypoint.ident}`.toLowerCase();
  }

  return [
    waypoint.sourceId,
    waypoint.type,
    waypoint.name,
    waypoint.coordinates.map((coord) => coord.toFixed(5)).join(','),
  ]
    .filter(Boolean)
    .join('|')
    .toLowerCase();
}
