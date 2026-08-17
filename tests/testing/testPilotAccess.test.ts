import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_SYNC_OWNER_STORAGE_KEY,
  DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
} from '@/lib/account/autoSync';
import { HALO_MAP_STORE_KEY } from '@/lib/recovery/haloClientRecovery';
import { HALO_MAP_STORE_VERSION } from '@/stores/mapStore';
import {
  buildFreshTestPilotMapStoreValue,
  prepareTestPilotLocalPlannerStorage,
  resolveTestPilotLinkContext,
  shouldTrackTestPilotOpened,
  TEST_PILOT_CONTINUE_HREF,
  TEST_PILOT_MAP_STORE_VERSION,
  TEST_PILOT_OPENED_STORAGE_KEY,
  TEST_PILOT_OWNER_STORAGE_VALUE,
  TEST_PILOT_STORAGE_BACKUP_PREFIX,
} from '@/lib/testing/testPilotAccess';

describe('test pilot access links', () => {
  it('enables local test pilot mode from a coded link', () => {
    expect(
      resolveTestPilotLinkContext({
        testPilot: '1',
        source: 'whatsapp-dm',
        pilot: 'p01',
      })
    ).toEqual({
      enabled: true,
      source: 'whatsapp-dm',
      pilotCode: 'p01',
    });
  });

  it('keeps normal unsigned visitors on the account gate', () => {
    expect(resolveTestPilotLinkContext({}).enabled).toBe(false);
    expect(resolveTestPilotLinkContext({ testPilot: '0' }).enabled).toBe(false);
  });

  it('falls back instead of accepting unsafe tracking values', () => {
    expect(
      resolveTestPilotLinkContext({
        testPilot: '1',
        source: 'pilot@example.com',
        pilot: 'John Smith',
      })
    ).toEqual({
      enabled: true,
      source: 'direct',
      pilotCode: 'unknown',
    });
  });

  it('uses a gate link that preserves the test pilot query flag', () => {
    expect(TEST_PILOT_CONTINUE_HREF).toBe('/?testPilot=1&source=access-gate');
  });

  it('starts test pilots from a clean planner store and backs up previous local data', () => {
    const storage = createMemoryStorage({
      [HALO_MAP_STORE_KEY]: JSON.stringify({
        state: {
          routeName: 'Deleted account route',
          waypoints: [
            { id: 'old-waypoint', type: 'user', name: 'Old point', coordinates: [28.1, -26.1] },
          ],
        },
        version: HALO_MAP_STORE_VERSION,
      }),
      [ACCOUNT_SYNC_OWNER_STORAGE_KEY]: 'deleted_user',
    });

    const result = prepareTestPilotLocalPlannerStorage({
      storage,
      now: new Date('2026-08-10T18:30:00.000Z'),
    });

    expect(result.resetPlannerStorage).toBe(true);
    expect(result.backupKey).toBe(`${TEST_PILOT_STORAGE_BACKUP_PREFIX}2026-08-10T18:30:00.000Z`);
    expect(storage.getItem(ACCOUNT_SYNC_OWNER_STORAGE_KEY)).toBe(TEST_PILOT_OWNER_STORAGE_VALUE);
    expect(JSON.parse(storage.getItem(HALO_MAP_STORE_KEY) || '{}')).toEqual({
      state: DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
      version: TEST_PILOT_MAP_STORE_VERSION,
    });
    expect(storage.getItem(result.backupKey || '')).toContain('Deleted account route');
  });

  it('preserves existing test-pilot planner data on reload', () => {
    const existingTestPilotStore = JSON.stringify({
      state: {
        ...DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
        routeName: 'Pilot test route',
      },
      version: HALO_MAP_STORE_VERSION,
    });
    const storage = createMemoryStorage({
      [HALO_MAP_STORE_KEY]: existingTestPilotStore,
      [ACCOUNT_SYNC_OWNER_STORAGE_KEY]: TEST_PILOT_OWNER_STORAGE_VALUE,
    });

    const result = prepareTestPilotLocalPlannerStorage({
      storage,
      now: new Date('2026-08-10T18:35:00.000Z'),
    });

    expect(result.resetPlannerStorage).toBe(false);
    expect(storage.getItem(HALO_MAP_STORE_KEY)).toBe(existingTestPilotStore);
  });

  it('keeps the test-pilot map store version aligned with the persisted map store', () => {
    expect(TEST_PILOT_MAP_STORE_VERSION).toBe(HALO_MAP_STORE_VERSION);
    expect(JSON.parse(buildFreshTestPilotMapStoreValue())).toMatchObject({
      version: HALO_MAP_STORE_VERSION,
    });
  });

  it('dedupes repeated opened events for the same session inside a short window', () => {
    const storage = createMemoryStorage({});

    expect(shouldTrackTestPilotOpened({
      storage,
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'session-123',
      now: new Date('2026-08-17T10:00:00.000Z'),
    })).toBe(true);

    expect(storage.getItem(TEST_PILOT_OPENED_STORAGE_KEY)).toContain('session-123');

    expect(shouldTrackTestPilotOpened({
      storage,
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'session-123',
      now: new Date('2026-08-17T10:00:05.000Z'),
    })).toBe(false);

    expect(shouldTrackTestPilotOpened({
      storage,
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'session-123',
      now: new Date('2026-08-17T10:00:11.000Z'),
    })).toBe(true);
  });

  it('tracks opened events when the source or pilot code changes', () => {
    const storage = createMemoryStorage({});

    expect(shouldTrackTestPilotOpened({
      storage,
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'session-123',
      now: new Date('2026-08-17T10:00:00.000Z'),
    })).toBe(true);

    expect(shouldTrackTestPilotOpened({
      storage,
      source: 'whatsapp-dm',
      pilotCode: 'p01',
      sessionId: 'session-123',
      now: new Date('2026-08-17T10:00:05.000Z'),
    })).toBe(true);
  });
});

function createMemoryStorage(initialValues: Record<string, string>) {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
