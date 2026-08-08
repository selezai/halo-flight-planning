'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { type StoredPlannerSnapshot } from '@/lib/account/plannerSnapshot';
import {
  buildAccountSyncSnapshotPayload,
  chooseAccountSyncRestoreState,
  createPlannerSnapshotFingerprint,
  createPlannerSnapshotStateFingerprint,
  extractAccountSyncSnapshotState,
  hasLocalPlannerSnapshotStorage,
  shouldSaveAccountSyncRestoreState,
} from '@/lib/account/autoSync';
import { HALO_MAP_STORE_KEY } from '@/lib/recovery/haloClientRecovery';
import { useMapStore } from '@/stores/mapStore';

const ACCOUNT_SYNC_DEBOUNCE_MS = 2_500;

interface SnapshotApiResponse {
  snapshot: StoredPlannerSnapshot | null;
  error?: string;
}

export default function AccountAutoSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const restorePlannerSnapshotState = useMapStore((state) => state.restorePlannerSnapshotState);
  const snapshotFingerprint = useMapStore((state) =>
    createPlannerSnapshotFingerprint(state as unknown as Record<string, unknown>)
  );
  const [syncReady, setSyncReady] = useState(false);
  const syncAvailableRef = useRef(false);
  const syncReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const scheduleSaveRef = useRef<() => void>(() => undefined);

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const saveLatestSnapshot = useCallback(async () => {
    if (!syncAvailableRef.current || !syncReadyRef.current) return;

    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    const currentState = useMapStore.getState() as unknown as Record<string, unknown>;
    const currentFingerprint = createPlannerSnapshotFingerprint(currentState);

    if (currentFingerprint === lastSavedFingerprintRef.current) return;

    saveInFlightRef.current = true;
    saveQueuedRef.current = false;

    try {
      const response = await fetch('/api/account/snapshot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAccountSyncSnapshotPayload(currentState)),
      });
      const payload = await parseSnapshotResponse(response);

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error || 'Could not save account snapshot.');
      }

      lastSavedFingerprintRef.current = currentFingerprint;
    } catch (error) {
      logAccountAutoSyncFailure('account_auto_sync_save_failed', error);
    } finally {
      saveInFlightRef.current = false;

      const latestFingerprint = createPlannerSnapshotFingerprint(
        useMapStore.getState() as unknown as Record<string, unknown>
      );
      if (
        syncAvailableRef.current &&
        syncReadyRef.current &&
        (saveQueuedRef.current || latestFingerprint !== lastSavedFingerprintRef.current)
      ) {
        saveQueuedRef.current = false;
        scheduleSaveRef.current();
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (!syncAvailableRef.current || !syncReadyRef.current) return;

    clearSaveTimer();
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveLatestSnapshot();
    }, ACCOUNT_SYNC_DEBOUNCE_MS);
  }, [clearSaveTimer, saveLatestSnapshot]);

  useEffect(() => {
    scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);

  useEffect(() => {
    syncReadyRef.current = syncReady;
  }, [syncReady]);

  useEffect(() => {
    if (!isLoaded) return;

    clearSaveTimer();
    setSyncReady(false);
    syncReadyRef.current = false;
    syncAvailableRef.current = false;
    lastSavedFingerprintRef.current = null;
    saveQueuedRef.current = false;

    if (!isSignedIn || !user?.id) return;

    let cancelled = false;

    async function loadRemoteSnapshot() {
      const localState = extractAccountSyncSnapshotState(
        useMapStore.getState() as unknown as Record<string, unknown>
      );
      const hasLocalPersistedState = hasLocalPlannerSnapshotStorage(
        readBrowserStorageValue(HALO_MAP_STORE_KEY)
      );

      try {
        const response = await fetch('/api/account/snapshot', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await parseSnapshotResponse(response);

        if (!response.ok) {
          throw new Error(payload.error || 'Could not load account snapshot.');
        }

        if (cancelled) return;

        syncAvailableRef.current = true;

        if (payload.snapshot) {
          const shouldSaveRestoredState = shouldSaveAccountSyncRestoreState({
            localState,
            remoteState: payload.snapshot.snapshot.state,
            hasLocalPersistedState,
          });
          const restoreState = chooseAccountSyncRestoreState({
            localState,
            remoteState: payload.snapshot.snapshot.state,
            hasLocalPersistedState,
          });

          restorePlannerSnapshotState(restoreState);
          lastSavedFingerprintRef.current = shouldSaveRestoredState
            ? createPlannerSnapshotStateFingerprint(payload.snapshot.snapshot.state)
            : createPlannerSnapshotFingerprint(
                useMapStore.getState() as unknown as Record<string, unknown>
              );
        } else {
          lastSavedFingerprintRef.current = hasLocalPersistedState
            ? null
            : createPlannerSnapshotFingerprint(
                useMapStore.getState() as unknown as Record<string, unknown>
              );
        }

        syncReadyRef.current = true;
        setSyncReady(true);
      } catch (error) {
        if (cancelled) return;

        syncAvailableRef.current = false;
        syncReadyRef.current = false;
        setSyncReady(false);
        logAccountAutoSyncFailure('account_auto_sync_load_failed', error);
      }
    }

    void loadRemoteSnapshot();

    return () => {
      cancelled = true;
      clearSaveTimer();
    };
  }, [
    clearSaveTimer,
    isLoaded,
    isSignedIn,
    restorePlannerSnapshotState,
    user?.id,
  ]);

  useEffect(() => {
    if (!syncReady || !syncAvailableRef.current) return;
    if (snapshotFingerprint === lastSavedFingerprintRef.current) return;

    scheduleSave();
  }, [scheduleSave, snapshotFingerprint, syncReady]);

  useEffect(() => clearSaveTimer, [clearSaveTimer]);

  return null;
}

async function parseSnapshotResponse(response: Response): Promise<SnapshotApiResponse> {
  try {
    return await response.json() as SnapshotApiResponse;
  } catch {
    return {
      snapshot: null,
      error: 'Account snapshot response was not valid JSON.',
    };
  }
}

function readBrowserStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function logAccountAutoSyncFailure(message: string, error: unknown) {
  console.warn(JSON.stringify({
    level: 'warn',
    message,
    error: error instanceof Error ? error.message : 'Unknown account sync error',
    timestamp: new Date().toISOString(),
  }));
}
