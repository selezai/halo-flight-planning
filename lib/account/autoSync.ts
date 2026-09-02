import {
  mergePlannerSnapshotStates,
  plannerSnapshotStateSchema,
  PLANNER_SNAPSHOT_KEYS,
  PLANNER_SNAPSHOT_VERSION,
  type PlannerSnapshotPayload,
  type PlannerSnapshotState,
} from '@/lib/account/plannerSnapshot';
import {
  DEFAULT_AIRCRAFT,
  DEFAULT_PERSONAL_MINIMUMS,
} from '@/lib/planning/aircraft';
import {
  DEFAULT_CLOSE_REMINDER,
  DEFAULT_FILING_CHECKLIST,
} from '@/lib/planning/filingReminder';
import {
  DEFAULT_FLIGHT_PLAN_FILING_RECORD,
  DEFAULT_NOTAM_BRIEFING_RECORD,
} from '@/lib/planning/flightAdmin';
import { DEFAULT_FUEL_PLANNING_STATE } from '@/lib/planning/fuel';
import { buildDefaultGridMoraReview } from '@/lib/planning/gridMora';
import { DEFAULT_TRAINING_WIND } from '@/lib/planning/trainingNavlog';
import { DEFAULT_WEIGHT_BALANCE_LOADING } from '@/lib/planning/weightBalance';

const DEFAULT_VISIBLE_LAYERS = {
  airports: true,
  navaids: true,
  airspaces: true,
  reportingPoints: true,
  obstacles: true,
  hotspots: true,
  hangGlidings: true,
  rcAirfields: true,
};

export const DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE: PlannerSnapshotState = plannerSnapshotStateSchema.parse({
  center: [28.0, -26.0],
  zoom: 7,
  visibleLayers: DEFAULT_VISIBLE_LAYERS,
  aircraftTrackingEnabled: false,
  routeName: 'South Africa cross-country',
  routeNotes: '',
  departureTime: '',
  cruiseAltitudeFt: 6500,
  activeMissionId: 'mission-local-active',
  missionLibrary: [],
  waypoints: [],
  activeAircraft: DEFAULT_AIRCRAFT,
  selectedAircraftPerformanceProfileId: undefined,
  fuelPlanning: DEFAULT_FUEL_PLANNING_STATE,
  gridMoraReview: buildDefaultGridMoraReview(),
  weightBalanceLoading: DEFAULT_WEIGHT_BALANCE_LOADING,
  weightBalanceLoadTemplates: [],
  selectedRouteCandidateId: undefined,
  trainingWind: DEFAULT_TRAINING_WIND,
  filingChecklist: DEFAULT_FILING_CHECKLIST,
  notamBriefingRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
  flightPlanFilingRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
  closeReminder: DEFAULT_CLOSE_REMINDER,
  emergencyLandingSites: [],
  personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
});

export const ACCOUNT_SYNC_OWNER_STORAGE_KEY = 'halo-account-sync-owner';

export function createPlannerSnapshotFingerprint(source: Record<string, unknown>): string {
  return createPlannerSnapshotStateFingerprint(extractAccountSyncSnapshotState(source));
}

export function createPlannerSnapshotStateFingerprint(state: PlannerSnapshotState): string {
  return JSON.stringify(plannerSnapshotStateSchema.parse(state));
}

export function buildAccountSyncSnapshotPayload(
  source: Record<string, unknown>,
  now = new Date()
): PlannerSnapshotPayload {
  return {
    version: PLANNER_SNAPSHOT_VERSION,
    savedAt: now.toISOString(),
    source: 'halo-browser',
    state: extractAccountSyncSnapshotState(source),
  };
}

export function extractAccountSyncSnapshotState(source: Record<string, unknown>): PlannerSnapshotState {
  const snapshot: Record<string, unknown> = {};

  for (const key of PLANNER_SNAPSHOT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

    const candidate = {
      [key]: source[key],
    };

    if (plannerSnapshotStateSchema.safeParse(candidate).success) {
      snapshot[key] = source[key];
    }
  }

  return plannerSnapshotStateSchema.parse(snapshot);
}

export function hasLocalPlannerSnapshotStorage(storageValue: string | null | undefined): boolean {
  if (!storageValue) return false;

  try {
    const parsed = JSON.parse(storageValue) as { state?: unknown };
    return Boolean(parsed && typeof parsed === 'object' && parsed.state);
  } catch {
    return false;
  }
}

export function isLocalPlannerSnapshotTrustedForUser({
  currentUserId,
  hasLocalPersistedState,
  storedOwnerUserId,
}: {
  currentUserId: string;
  hasLocalPersistedState: boolean;
  storedOwnerUserId: string | null | undefined;
}): boolean {
  return hasLocalPersistedState && storedOwnerUserId === currentUserId;
}

export function shouldResetLocalPlannerSnapshotForUser({
  currentUserId,
  hasLocalPersistedState,
  storedOwnerUserId,
}: {
  currentUserId: string;
  hasLocalPersistedState: boolean;
  storedOwnerUserId: string | null | undefined;
}): boolean {
  return hasLocalPersistedState && storedOwnerUserId !== currentUserId;
}

export function resolveAccountScopedPlannerStorage({
  currentUserId,
  hasLocalPersistedState,
  storedOwnerUserId,
}: {
  currentUserId: string;
  hasLocalPersistedState: boolean;
  storedOwnerUserId: string | null | undefined;
}): {
  ownerUserId: string;
  shouldResetLocalPlannerState: boolean;
  localSnapshotTrusted: boolean;
} {
  return {
    ownerUserId: currentUserId,
    shouldResetLocalPlannerState: shouldResetLocalPlannerSnapshotForUser({
      currentUserId,
      hasLocalPersistedState,
      storedOwnerUserId,
    }),
    localSnapshotTrusted: isLocalPlannerSnapshotTrustedForUser({
      currentUserId,
      hasLocalPersistedState,
      storedOwnerUserId,
    }),
  };
}

export function hasMeaningfulLocalPlannerSnapshot(localState: PlannerSnapshotState): boolean {
  return createPlannerSnapshotStateFingerprint(localState) !== createPlannerSnapshotStateFingerprint(DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE);
}

export function chooseAccountSyncRestoreState({
  localState,
  remoteState,
  hasLocalPersistedState,
}: {
  localState: PlannerSnapshotState;
  remoteState: PlannerSnapshotState;
  hasLocalPersistedState: boolean;
}): PlannerSnapshotState {
  if (!hasLocalPersistedState || !hasMeaningfulLocalPlannerSnapshot(localState)) {
    return remoteState;
  }

  return mergePlannerSnapshotStates(localState, remoteState);
}

export function shouldSaveAccountSyncRestoreState({
  localState,
  remoteState,
  hasLocalPersistedState,
}: {
  localState: PlannerSnapshotState;
  remoteState: PlannerSnapshotState;
  hasLocalPersistedState: boolean;
}): boolean {
  if (!hasLocalPersistedState || !hasMeaningfulLocalPlannerSnapshot(localState)) {
    return false;
  }

  const mergedState = mergePlannerSnapshotStates(localState, remoteState);
  return createPlannerSnapshotStateFingerprint(mergedState) !== createPlannerSnapshotStateFingerprint(remoteState);
}
