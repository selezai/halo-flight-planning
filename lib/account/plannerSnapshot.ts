import { z } from 'zod';

export const PLANNER_SNAPSHOT_VERSION = 1;
export const MAX_PLANNER_SNAPSHOT_BYTES = 1_000_000;

export const PLANNER_SNAPSHOT_KEYS = [
  'center',
  'zoom',
  'visibleLayers',
  'routeName',
  'routeNotes',
  'departureTime',
  'cruiseAltitudeFt',
  'activeMissionId',
  'missionLibrary',
  'waypoints',
  'activeAircraft',
  'weightBalanceLoading',
  'trainingWind',
  'filingChecklist',
  'notamBriefingRecord',
  'flightPlanFilingRecord',
  'closeReminder',
  'emergencyLandingSites',
  'personalMinimums',
] as const;

export type PlannerSnapshotKey = typeof PLANNER_SNAPSHOT_KEYS[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const plannerSnapshotStateSchema = z.object({
  center: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  zoom: z.number().finite().min(0).max(24).optional(),
  visibleLayers: z.record(z.string(), z.boolean()).optional(),
  routeName: z.string().max(160).optional(),
  routeNotes: z.string().max(20_000).optional(),
  departureTime: z.string().max(80).optional(),
  cruiseAltitudeFt: z.number().finite().min(0).max(60_000).optional(),
  activeMissionId: z.string().max(160).optional(),
  missionLibrary: z.array(jsonObjectSchema).max(200).optional(),
  waypoints: z.array(jsonValueSchema).max(200).optional(),
  activeAircraft: jsonObjectSchema.optional(),
  weightBalanceLoading: jsonObjectSchema.optional(),
  trainingWind: jsonObjectSchema.optional(),
  filingChecklist: jsonObjectSchema.optional(),
  notamBriefingRecord: jsonObjectSchema.optional(),
  flightPlanFilingRecord: jsonObjectSchema.optional(),
  closeReminder: jsonObjectSchema.optional(),
  emergencyLandingSites: z.array(jsonObjectSchema).max(500).optional(),
  personalMinimums: jsonObjectSchema.optional(),
}).strict();

export const plannerSnapshotPayloadSchema = z.object({
  version: z.literal(PLANNER_SNAPSHOT_VERSION),
  savedAt: z.string().datetime(),
  source: z.literal('halo-browser'),
  state: plannerSnapshotStateSchema,
}).strict();

export type PlannerSnapshotState = z.infer<typeof plannerSnapshotStateSchema>;
export type PlannerSnapshotPayload = z.infer<typeof plannerSnapshotPayloadSchema>;

export interface StoredPlannerSnapshot {
  userId: string;
  snapshot: PlannerSnapshotPayload;
  createdAt: string;
  updatedAt: string;
}

export function getPlannerSnapshotByteLength(snapshot: unknown): number {
  return new TextEncoder().encode(JSON.stringify(snapshot)).length;
}

export function parsePlannerSnapshotPayload(input: unknown): PlannerSnapshotPayload {
  const byteLength = getPlannerSnapshotByteLength(input);
  if (byteLength > MAX_PLANNER_SNAPSHOT_BYTES) {
    throw new Error(`Planner snapshot cannot exceed ${MAX_PLANNER_SNAPSHOT_BYTES} bytes.`);
  }

  return plannerSnapshotPayloadSchema.parse(input);
}

export function extractPlannerSnapshotState(source: Record<string, unknown>): PlannerSnapshotState {
  const snapshot: Record<string, unknown> = {};

  for (const key of PLANNER_SNAPSHOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      snapshot[key] = source[key];
    }
  }

  return plannerSnapshotStateSchema.parse(snapshot);
}

export function buildPlannerSnapshotPayload(
  source: Record<string, unknown>,
  now = new Date()
): PlannerSnapshotPayload {
  return {
    version: PLANNER_SNAPSHOT_VERSION,
    savedAt: now.toISOString(),
    source: 'halo-browser',
    state: extractPlannerSnapshotState(source),
  };
}

export function mergePlannerSnapshotStates(
  localState: PlannerSnapshotState,
  remoteState: PlannerSnapshotState
): PlannerSnapshotState {
  const merged: PlannerSnapshotState = {
    ...remoteState,
    ...localState,
  };

  if (remoteState.visibleLayers || localState.visibleLayers) {
    merged.visibleLayers = {
      ...remoteState.visibleLayers,
      ...localState.visibleLayers,
    };
  }

  merged.routeName = preferNonEmptyString(localState.routeName, remoteState.routeName);
  merged.routeNotes = preferNonEmptyString(localState.routeNotes, remoteState.routeNotes);
  merged.departureTime = preferNonEmptyString(localState.departureTime, remoteState.departureTime);
  merged.activeMissionId = preferNonEmptyString(localState.activeMissionId, remoteState.activeMissionId);

  if (localState.waypoints?.length) {
    merged.waypoints = localState.waypoints;
  } else if (remoteState.waypoints?.length) {
    merged.waypoints = remoteState.waypoints;
  }

  if (remoteState.weightBalanceLoading || localState.weightBalanceLoading) {
    merged.weightBalanceLoading = mergeNestedRecord(
      remoteState.weightBalanceLoading,
      localState.weightBalanceLoading,
      'stationWeights'
    );
  }

  if (remoteState.personalMinimums || localState.personalMinimums) {
    merged.personalMinimums = {
      ...remoteState.personalMinimums,
      ...localState.personalMinimums,
    };
  }

  merged.emergencyLandingSites = mergeObjectArraysByIdentity(
    remoteState.emergencyLandingSites,
    localState.emergencyLandingSites
  );
  merged.missionLibrary = mergeObjectArraysByIdentity(
    remoteState.missionLibrary,
    localState.missionLibrary
  );

  return plannerSnapshotStateSchema.parse(merged);
}

function preferNonEmptyString(localValue?: string, remoteValue?: string): string | undefined {
  const trimmedLocal = localValue?.trim();
  if (trimmedLocal) return localValue;
  return remoteValue;
}

function mergeNestedRecord(
  remoteValue: Record<string, JsonValue> | undefined,
  localValue: Record<string, JsonValue> | undefined,
  nestedKey: string
): Record<string, JsonValue> {
  const merged: Record<string, JsonValue> = {
    ...remoteValue,
    ...localValue,
  };

  const remoteNested = getRecord(remoteValue?.[nestedKey]);
  const localNested = getRecord(localValue?.[nestedKey]);

  if (remoteNested || localNested) {
    merged[nestedKey] = {
      ...remoteNested,
      ...localNested,
    };
  }

  return merged;
}

function mergeObjectArraysByIdentity(
  remoteItems: Array<Record<string, JsonValue>> | undefined,
  localItems: Array<Record<string, JsonValue>> | undefined
): Array<Record<string, JsonValue>> | undefined {
  if (!remoteItems?.length && !localItems?.length) return undefined;

  const itemsByKey = new Map<string, Record<string, JsonValue>>();

  for (const item of remoteItems ?? []) {
    itemsByKey.set(getObjectIdentity(item), item);
  }

  for (const item of localItems ?? []) {
    const key = getObjectIdentity(item);
    itemsByKey.set(key, {
      ...itemsByKey.get(key),
      ...item,
    });
  }

  return Array.from(itemsByKey.values());
}

function getObjectIdentity(item: Record<string, JsonValue>): string {
  const id = typeof item.id === 'string' ? item.id : undefined;
  if (id) return `id:${id}`;

  const name = typeof item.name === 'string' ? item.name : 'unknown';
  const coordinates = Array.isArray(item.coordinates) ? item.coordinates.join(',') : 'no-coordinates';
  return `site:${name}:${coordinates}`;
}

function getRecord(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value;
}
