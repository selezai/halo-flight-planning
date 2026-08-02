import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildHaloClientErrorPayload,
  buildHaloLocalDataExportText,
  collectHaloLocalDataExport,
  countExportedHaloLocalDataKeys,
  HALO_MAP_STORE_KEY,
  isHaloCacheName,
  reportHaloClientError,
} from '@/lib/recovery/haloClientRecovery';
import { HALO_OFFLINE_MISSION_SNAPSHOT_KEY } from '@/lib/planning/offlineMission';

describe('Halo client recovery helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exports only Halo-owned local planner records', () => {
    const storage = createStorage({
      [HALO_MAP_STORE_KEY]: '{"state":{"routeName":"FAOR-FALA"}}',
      [HALO_OFFLINE_MISSION_SNAPSHOT_KEY]: '{"routeName":"Offline"}',
      unrelated: 'do not export',
    });

    const exportData = collectHaloLocalDataExport({
      storage,
      origin: 'https://halo.test',
      now: new Date('2026-08-02T12:00:00.000Z'),
      buildId: 'build-123',
    });

    expect(exportData).toMatchObject({
      version: 1,
      exportedAt: '2026-08-02T12:00:00.000Z',
      buildId: 'build-123',
      origin: 'https://halo.test',
      keys: {
        [HALO_MAP_STORE_KEY]: '{"state":{"routeName":"FAOR-FALA"}}',
        [HALO_OFFLINE_MISSION_SNAPSHOT_KEY]: '{"routeName":"Offline"}',
      },
    });
    expect(countExportedHaloLocalDataKeys(exportData)).toBe(2);
    expect(buildHaloLocalDataExportText(exportData)).not.toContain('unrelated');
  });

  it('handles unavailable browser storage without throwing', () => {
    const exportData = collectHaloLocalDataExport({
      storage: undefined,
      origin: 'https://halo.test',
    });

    expect(exportData.keys).toEqual({});
    expect(countExportedHaloLocalDataKeys(exportData)).toBe(0);
  });

  it('identifies only Halo offline caches for repair cleanup', () => {
    expect(isHaloCacheName('halo-offline-shell-v2')).toBe(true);
    expect(isHaloCacheName('halo-offline-shell-v3')).toBe(true);
    expect(isHaloCacheName('workbox-precache')).toBe(false);
  });

  it('builds client error payloads without stack traces', () => {
    const error = new Error('Location overlay failed');
    error.stack = 'secret stack';

    const payload = buildHaloClientErrorPayload({
      source: 'app-error-boundary',
      error,
    });

    expect(payload).toMatchObject({
      source: 'app-error-boundary',
      errorName: 'Error',
      errorMessage: 'Location overlay failed',
    });
    expect(JSON.stringify(payload)).not.toContain('secret stack');
  });

  it('never throws if client error reporting fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(reportHaloClientError({
      source: 'client-recovery',
      message: 'Repair requested',
    })).resolves.toBeUndefined();
  });
});

function createStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
