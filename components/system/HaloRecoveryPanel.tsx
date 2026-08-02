'use client';

import { useEffect, useState } from 'react';
import {
  downloadHaloLocalDataExport,
  repairHaloClientRuntime,
  reportHaloClientError,
} from '@/lib/recovery/haloClientRecovery';

interface HaloRecoveryPanelProps {
  error: Error & { digest?: string };
  reset: () => void;
  source: 'app-error-boundary' | 'global-error-boundary';
  eyebrow: string;
  title: string;
  description: string;
  showDigest?: boolean;
}

export default function HaloRecoveryPanel({
  error,
  reset,
  source,
  eyebrow,
  title,
  description,
  showDigest = true,
}: HaloRecoveryPanelProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'repair' | 'reset' | 'export' | null>(null);

  useEffect(() => {
    console.error(JSON.stringify({
      level: 'error',
      message: source,
      error: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    }));

    void reportHaloClientError({
      source,
      error,
    });
  }, [error, source]);

  const handleExport = () => {
    setBusyAction('export');
    const result = downloadHaloLocalDataExport();
    setStatusMessage(result.message);
    setBusyAction(null);
  };

  const handleRepair = async () => {
    setBusyAction('repair');
    setStatusMessage('Repairing Halo cache and service worker…');
    await repairHaloClientRuntime({ clearPlannerData: false });
    setStatusMessage('Repair complete. Reloading…');
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Reset Halo data in this browser? Halo will keep a recovery backup where possible, then reload with a clean planner.'
    );
    if (!confirmed) return;

    setBusyAction('reset');
    setStatusMessage('Resetting Halo app data…');
    await repairHaloClientRuntime({ clearPlannerData: true });
    setStatusMessage('Reset complete. Reloading…');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {description}
        </p>
        {showDigest && error.digest && (
          <p className="mt-3 break-all rounded-lg bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-500">
            Digest: {error.digest}
          </p>
        )}
        {statusMessage && (
          <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
            {statusMessage}
          </p>
        )}
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={handleRepair}
            disabled={busyAction !== null}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-wait disabled:opacity-60"
          >
            {busyAction === 'repair' ? 'Repairing…' : 'Repair and reload'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={busyAction !== null}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            {busyAction === 'export' ? 'Preparing export…' : 'Download saved planner data'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={busyAction !== null}
            className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-wait disabled:opacity-60"
          >
            {busyAction === 'reset' ? 'Resetting…' : 'Reset Halo app data'}
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Repair clears Halo&apos;s app shell cache and service worker only. Reset clears this browser&apos;s
          local Halo planner state after attempting to keep a recovery backup.
        </p>
      </section>
    </main>
  );
}
