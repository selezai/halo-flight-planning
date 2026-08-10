'use client';

import { useEffect, useState } from 'react';
import {
  ACCOUNT_SYNC_OWNER_STORAGE_KEY,
  DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE,
  hasLocalPlannerSnapshotStorage,
  shouldResetLocalPlannerSnapshotForUser,
} from '@/lib/account/autoSync';
import { HALO_MAP_STORE_KEY } from '@/lib/recovery/haloClientRecovery';
import { useMapStore } from '@/stores/mapStore';
import AccountAutoSync from '@/components/auth/AccountAutoSync';
import HaloAppShell from '@/components/shell/HaloAppShell';
import HaloLogo from '@/components/shell/HaloLogo';

export default function AccountScopedPlanner({ userId }: { userId: string }) {
  const restorePlannerSnapshotState = useMapStore((state) => state.restorePlannerSnapshotState);
  const [accountScopeChecked, setAccountScopeChecked] = useState(false);

  useEffect(() => {
    const hasLocalPersistedState = hasLocalPlannerSnapshotStorage(
      readBrowserStorageValue(HALO_MAP_STORE_KEY)
    );
    const storedOwnerUserId = readBrowserStorageValue(ACCOUNT_SYNC_OWNER_STORAGE_KEY);

    if (shouldResetLocalPlannerSnapshotForUser({
      currentUserId: userId,
      hasLocalPersistedState,
      storedOwnerUserId,
    })) {
      restorePlannerSnapshotState(DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE);
    }

    setAccountScopeChecked(true);
  }, [restorePlannerSnapshotState, userId]);

  if (!accountScopeChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f4e8] px-4 py-8 text-slate-950">
        <section className="w-full max-w-sm rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <HaloLogo size="md" />
          <p className="mt-5 text-sm font-semibold text-slate-700">Loading planner...</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <AccountAutoSync />
      <HaloAppShell />
    </>
  );
}

function readBrowserStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
