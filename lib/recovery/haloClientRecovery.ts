import { HALO_OFFLINE_MISSION_SNAPSHOT_KEY } from '@/lib/planning/offlineMission';
import { ACCOUNT_SYNC_OWNER_STORAGE_KEY } from '@/lib/account/autoSync';

export const HALO_MAP_STORE_KEY = 'halo-map-store';
export const HALO_RECOVERY_BACKUP_PREFIX = 'halo-recovery-backup-';
export const HALO_CACHE_PREFIX = 'halo-offline-shell-';
export const HALO_SERVICE_WORKER_URL = '/sw.js';
export const HALO_BUILD_ID = process.env.NEXT_PUBLIC_HALO_BUILD_ID || 'local';

export const HALO_LOCAL_STORAGE_KEYS = [
  HALO_MAP_STORE_KEY,
  ACCOUNT_SYNC_OWNER_STORAGE_KEY,
  HALO_OFFLINE_MISSION_SNAPSHOT_KEY,
] as const;

export type HaloLocalStorageKey = (typeof HALO_LOCAL_STORAGE_KEYS)[number];

export interface HaloStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface HaloLocalDataExport {
  version: 1;
  exportedAt: string;
  buildId: string;
  origin: string;
  keys: Partial<Record<HaloLocalStorageKey, string>>;
}

export interface HaloRecoveryResult {
  exportedKeyCount: number;
  clearedLocalKeys: string[];
  backedUpTo?: string;
  clearedCaches: string[];
  unregisteredServiceWorkers: number;
}

export interface HaloClientErrorInput {
  source: 'app-error-boundary' | 'global-error-boundary' | 'client-recovery';
  error?: Error & { digest?: string };
  message?: string;
  digest?: string;
}

export function collectHaloLocalDataExport({
  storage,
  origin = 'unknown',
  now = new Date(),
  buildId = HALO_BUILD_ID,
}: {
  storage: HaloStorageLike | undefined;
  origin?: string;
  now?: Date;
  buildId?: string;
}): HaloLocalDataExport {
  const keys: HaloLocalDataExport['keys'] = {};

  if (storage) {
    for (const key of HALO_LOCAL_STORAGE_KEYS) {
      const value = readStorageValue(storage, key);
      if (typeof value === 'string') {
        keys[key] = value;
      }
    }
  }

  return {
    version: 1,
    exportedAt: now.toISOString(),
    buildId,
    origin,
    keys,
  };
}

export function buildHaloLocalDataExportText(exportData: HaloLocalDataExport): string {
  return `${JSON.stringify(exportData, null, 2)}\n`;
}

export function countExportedHaloLocalDataKeys(exportData: HaloLocalDataExport): number {
  return Object.keys(exportData.keys).length;
}

export function isHaloCacheName(cacheName: string): boolean {
  return cacheName.startsWith(HALO_CACHE_PREFIX);
}

export function buildHaloClientErrorPayload(input: HaloClientErrorInput) {
  const errorMessage =
    input.message ??
    input.error?.message ??
    'Unknown Halo client error';

  return {
    source: input.source,
    buildId: HALO_BUILD_ID,
    errorName: input.error?.name,
    errorMessage,
    digest: input.digest ?? input.error?.digest,
    path: typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.hash}`,
    userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    occurredAt: new Date().toISOString(),
  };
}

export async function reportHaloClientError(input: HaloClientErrorInput): Promise<void> {
  if (typeof fetch === 'undefined') return;

  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildHaloClientErrorPayload(input)),
      keepalive: true,
    });
  } catch {
    // Reporting must never make an existing client crash worse.
  }
}

export function downloadHaloLocalDataExport(): { ok: boolean; message: string } {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { ok: false, message: 'Planner export is only available in the browser.' };
  }

  const exportData = collectHaloLocalDataExport({
    storage: window.localStorage,
    origin: window.location.origin,
  });
  const keyCount = countExportedHaloLocalDataKeys(exportData);

  if (keyCount === 0) {
    return { ok: false, message: 'No saved Halo planner data was found in this browser.' };
  }

  const blob = new Blob([buildHaloLocalDataExportText(exportData)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `halo-planner-recovery-${exportData.exportedAt.replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { ok: true, message: `Downloaded ${keyCount} Halo data record${keyCount === 1 ? '' : 's'}.` };
}

export async function repairHaloClientRuntime(options: {
  clearPlannerData?: boolean;
  reload?: boolean;
} = {}): Promise<HaloRecoveryResult> {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage;
  const exportData = collectHaloLocalDataExport({
    storage,
    origin: typeof window === 'undefined' ? 'unknown' : window.location.origin,
  });
  const result: HaloRecoveryResult = {
    exportedKeyCount: countExportedHaloLocalDataKeys(exportData),
    clearedLocalKeys: [],
    clearedCaches: await deleteHaloCaches(),
    unregisteredServiceWorkers: await unregisterHaloServiceWorkers(),
  };

  if (storage && options.clearPlannerData) {
    const backupKey = `${HALO_RECOVERY_BACKUP_PREFIX}${exportData.exportedAt}`;

    try {
      storage.setItem(backupKey, buildHaloLocalDataExportText(exportData));
      result.backedUpTo = backupKey;
    } catch {
      // Continue with reset even if the browser refuses the backup write.
    }

    for (const key of HALO_LOCAL_STORAGE_KEYS) {
      try {
        storage.removeItem(key);
        result.clearedLocalKeys.push(key);
      } catch {
        // Continue clearing other keys.
      }
    }
  }

  if (options.reload !== false && typeof window !== 'undefined') {
    window.location.reload();
  }

  return result;
}

async function deleteHaloCaches(): Promise<string[]> {
  if (typeof caches === 'undefined') return [];

  try {
    const cacheNames = await caches.keys();
    const haloCacheNames = cacheNames.filter(isHaloCacheName);
    await Promise.all(haloCacheNames.map((cacheName) => caches.delete(cacheName)));
    return haloCacheNames;
  } catch {
    return [];
  }
}

async function unregisterHaloServiceWorkers(): Promise<number> {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof navigator.serviceWorker.getRegistrations !== 'function'
  ) {
    return 0;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const haloRegistrations = registrations.filter((registration) => {
      const scriptUrl = registration.active?.scriptURL ||
        registration.waiting?.scriptURL ||
        registration.installing?.scriptURL ||
        '';
      return scriptUrl.endsWith(HALO_SERVICE_WORKER_URL);
    });

    const results = await Promise.all(haloRegistrations.map((registration) => registration.unregister()));
    return results.filter(Boolean).length;
  } catch {
    return 0;
  }
}

function readStorageValue(storage: HaloStorageLike, key: string): string | undefined {
  try {
    return storage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}
