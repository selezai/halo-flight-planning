'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import HaloLogo from '@/components/shell/HaloLogo';
import {
  prepareTestPilotLocalPlannerStorage,
} from '@/lib/testing/testPilotAccess';
import TestPilotTracker from './TestPilotTracker';

const HaloAppShell = dynamic(() => import('@/components/shell/HaloAppShell'), {
  ssr: false,
  loading: () => <TestPilotPlannerLoading />,
});

interface TestPilotPlannerProps {
  source: string;
  pilotCode: string;
}

export default function TestPilotPlanner({
  source,
  pilotCode,
}: TestPilotPlannerProps) {
  const [storagePrepared, setStoragePrepared] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareStorage() {
      const result = prepareTestPilotLocalPlannerStorage({
        storage: window.localStorage,
      });

      if (result.resetPlannerStorage) {
        const [
          { DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE },
          { useMapStore },
        ] = await Promise.all([
          import('@/lib/account/autoSync'),
          import('@/stores/mapStore'),
        ]);

        useMapStore.getState().restorePlannerSnapshotState(DEFAULT_ACCOUNT_SYNC_SNAPSHOT_STATE);
      }

      if (active) {
        setStoragePrepared(true);
      }
    }

    void prepareStorage();

    return () => {
      active = false;
    };
  }, []);

  if (!storagePrepared) {
    return <TestPilotPlannerLoading />;
  }

  return (
    <>
      <TestPilotTracker source={source} pilotCode={pilotCode} />
      <HaloAppShell />
    </>
  );
}

function TestPilotPlannerLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4e8] px-4 py-8 text-slate-950">
      <section className="w-full max-w-sm rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <HaloLogo size="md" />
        <p className="mt-5 text-sm font-semibold text-slate-700">Loading planner...</p>
      </section>
    </main>
  );
}
