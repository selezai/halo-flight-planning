import {
  ACCOUNT_SYNC_OWNER_STORAGE_KEY,
  DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
} from '@/lib/account/autoSync';
import { HALO_MAP_STORE_KEY } from '@/lib/recovery/haloClientRecovery';

export const TEST_PILOT_QUERY_PARAM = 'testPilot';
export const TEST_PILOT_SOURCE_QUERY_PARAM = 'source';
export const TEST_PILOT_CODE_QUERY_PARAM = 'pilot';
export const TEST_PILOT_SESSION_STORAGE_KEY = 'halo-test-pilot-session';
export const TEST_PILOT_STARTED_STORAGE_KEY = 'halo-test-pilot-started';
export const TEST_PILOT_CONTINUE_HREF = '/?testPilot=1&source=access-gate';
export const TEST_PILOT_OWNER_STORAGE_VALUE = 'test-pilot';
export const TEST_PILOT_STORAGE_BACKUP_PREFIX = 'halo-test-pilot-storage-backup-';
export const TEST_PILOT_MAP_STORE_VERSION = 3;

export type TestPilotSearchParams = Record<string, string | string[] | undefined>;

export interface TestPilotStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface TestPilotLinkContext {
  enabled: boolean;
  source: string;
  pilotCode: string;
}

export interface TestPilotStoragePreparation {
  resetPlannerStorage: boolean;
  backupKey?: string;
}

const DEFAULT_TEST_PILOT_SOURCE = 'direct';
const UNKNOWN_TEST_PILOT_CODE = 'unknown';
const MAX_TRACKING_VALUE_LENGTH = 80;
const SAFE_TRACKING_VALUE_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/i;

export function resolveTestPilotLinkContext(
  searchParams: TestPilotSearchParams
): TestPilotLinkContext {
  const enabled = getSingleSearchParam(searchParams[TEST_PILOT_QUERY_PARAM]) === '1';

  return {
    enabled,
    source: sanitizeTrackingValue(
      getSingleSearchParam(searchParams[TEST_PILOT_SOURCE_QUERY_PARAM]),
      DEFAULT_TEST_PILOT_SOURCE
    ),
    pilotCode: sanitizeTrackingValue(
      getSingleSearchParam(searchParams[TEST_PILOT_CODE_QUERY_PARAM]),
      UNKNOWN_TEST_PILOT_CODE
    ),
  };
}

export function createTestPilotSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function prepareTestPilotLocalPlannerStorage({
  storage,
  now = new Date(),
}: {
  storage: TestPilotStorageLike | undefined;
  now?: Date;
}): TestPilotStoragePreparation {
  if (!storage) return { resetPlannerStorage: false };

  const currentOwner = readStorageValue(storage, ACCOUNT_SYNC_OWNER_STORAGE_KEY);
  if (currentOwner === TEST_PILOT_OWNER_STORAGE_VALUE) {
    return { resetPlannerStorage: false };
  }

  const existingMapStore = readStorageValue(storage, HALO_MAP_STORE_KEY);
  const backupKey = backupExistingPlannerStorage({
    storage,
    mapStore: existingMapStore,
    accountOwner: currentOwner,
    now,
  });

  writeStorageValue(storage, HALO_MAP_STORE_KEY, buildFreshTestPilotMapStoreValue());
  writeStorageValue(storage, ACCOUNT_SYNC_OWNER_STORAGE_KEY, TEST_PILOT_OWNER_STORAGE_VALUE);

  return {
    resetPlannerStorage: true,
    backupKey,
  };
}

export function buildFreshTestPilotMapStoreValue(): string {
  return JSON.stringify({
    state: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
    version: TEST_PILOT_MAP_STORE_VERSION,
  });
}

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function sanitizeTrackingValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const clipped = trimmed.slice(0, MAX_TRACKING_VALUE_LENGTH);
  return SAFE_TRACKING_VALUE_PATTERN.test(clipped) ? clipped : fallback;
}

function backupExistingPlannerStorage({
  storage,
  mapStore,
  accountOwner,
  now,
}: {
  storage: TestPilotStorageLike;
  mapStore: string | null;
  accountOwner: string | null;
  now: Date;
}): string | undefined {
  if (!mapStore && !accountOwner) return undefined;

  const backupKey = `${TEST_PILOT_STORAGE_BACKUP_PREFIX}${now.toISOString()}`;
  const backupValue = JSON.stringify({
    version: 1,
    backedUpAt: now.toISOString(),
    mapStore,
    accountOwner,
  });

  return writeStorageValue(storage, backupKey, backupValue) ? backupKey : undefined;
}

function readStorageValue(storage: TestPilotStorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(storage: TestPilotStorageLike, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
