import type {
  HaloMissionPlannerState,
  HaloMissionRecord,
  HaloMissionStatus,
  Waypoint,
} from '@/types/planning';

export type HaloMissionSummaryStatus = 'idle' | 'ready' | 'review' | 'stop';

export interface CreateMissionRecordParams {
  id: string;
  state: HaloMissionPlannerState;
  status?: HaloMissionStatus;
  now?: Date;
  existing?: HaloMissionRecord;
  name?: string;
}

export function buildMissionDisplayName(
  routeName: string | undefined,
  waypoints: Waypoint[]
): string {
  const trimmedName = routeName?.trim();
  if (trimmedName) return trimmedName;

  if (waypoints.length >= 2) {
    return [
      formatWaypointLabel(waypoints[0]),
      formatWaypointLabel(waypoints.at(-1)),
    ].filter(Boolean).join(' → ');
  }

  if (waypoints.length === 1) {
    return `${formatWaypointLabel(waypoints[0])} mission`;
  }

  return 'Untitled mission';
}

export function buildMissionRouteLabel(waypoints: Waypoint[]): string {
  if (waypoints.length === 0) return 'No route yet';

  const first = formatWaypointLabel(waypoints[0]);
  const last = formatWaypointLabel(waypoints.at(-1));
  const waypointLabel = `${waypoints.length} waypoint${waypoints.length === 1 ? '' : 's'}`;

  if (waypoints.length === 1) return `${first} · ${waypointLabel}`;
  return `${first} → ${last} · ${waypointLabel}`;
}

export function createMissionRecord({
  id,
  state,
  status = 'draft',
  now = new Date(),
  existing,
  name,
}: CreateMissionRecordParams): HaloMissionRecord {
  const savedAt = now.toISOString();
  const missionName = name?.trim() || buildMissionDisplayName(state.routeName, state.waypoints);

  return {
    id,
    name: missionName,
    status,
    routeLabel: buildMissionRouteLabel(state.waypoints),
    aircraftLabel: formatAircraftLabel(state),
    waypointCount: state.waypoints.length,
    createdAt: existing?.createdAt ?? savedAt,
    updatedAt: savedAt,
    flownAt: status === 'flown' ? existing?.flownAt ?? savedAt : undefined,
    archivedAt: status === 'archived' ? existing?.archivedAt ?? savedAt : undefined,
    state: cloneMissionPlannerState({
      ...state,
      routeName: missionName,
    }),
  };
}

export function upsertMissionRecord(
  records: HaloMissionRecord[],
  record: HaloMissionRecord
): HaloMissionRecord[] {
  const nextRecords = records.some((item) => item.id === record.id)
    ? records.map((item) => item.id === record.id ? record : item)
    : [record, ...records];

  return sortMissionRecords(nextRecords);
}

export function sortMissionRecords(records: HaloMissionRecord[]): HaloMissionRecord[] {
  return [...records].sort((left, right) => {
    const leftArchived = left.status === 'archived' ? 1 : 0;
    const rightArchived = right.status === 'archived' ? 1 : 0;
    if (leftArchived !== rightArchived) return leftArchived - rightArchived;

    const leftTime = Date.parse(left.status === 'archived' ? left.archivedAt ?? left.updatedAt : left.updatedAt);
    const rightTime = Date.parse(right.status === 'archived' ? right.archivedAt ?? right.updatedAt : right.updatedAt);
    return rightTime - leftTime;
  });
}

export function getDraftMissionRecords(records: HaloMissionRecord[]): HaloMissionRecord[] {
  return records.filter((record) => record.status !== 'archived' && record.status !== 'flown');
}

export function getFlightHistoryRecords(records: HaloMissionRecord[]): HaloMissionRecord[] {
  return records.filter((record) => record.status === 'flown');
}

export function getArchivedMissionRecords(records: HaloMissionRecord[]): HaloMissionRecord[] {
  return records.filter((record) => record.status === 'archived');
}

export function getMissionStatusFromHaloStatus(status: HaloMissionSummaryStatus): HaloMissionStatus {
  if (status === 'ready') return 'ready';
  if (status === 'idle') return 'draft';
  return 'needs-review';
}

export function archiveMissionRecord(
  record: HaloMissionRecord,
  now = new Date()
): HaloMissionRecord {
  const archivedAt = now.toISOString();

  return {
    ...record,
    status: 'archived',
    archivedAt,
    updatedAt: archivedAt,
  };
}

export function markMissionRecordFlown(
  record: HaloMissionRecord,
  now = new Date()
): HaloMissionRecord {
  const flownAt = now.toISOString();

  return {
    ...record,
    status: 'flown',
    flownAt,
    archivedAt: undefined,
    updatedAt: flownAt,
  };
}

export function cloneMissionPlannerState(
  state: HaloMissionPlannerState
): HaloMissionPlannerState {
  return JSON.parse(JSON.stringify(state)) as HaloMissionPlannerState;
}

function formatWaypointLabel(waypoint: Waypoint | undefined): string {
  if (!waypoint) return '';
  return waypoint.ident?.trim() || waypoint.name.trim() || 'Waypoint';
}

function formatAircraftLabel(state: HaloMissionPlannerState): string {
  const registration = state.activeAircraft.registration.trim();
  const type = state.activeAircraft.type.trim();
  const label = [registration, type].filter(Boolean).join(' · ');
  return label || state.activeAircraft.name || 'Aircraft not selected';
}
