'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Halo app error boundary', {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-md rounded-lg border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Halo hit an application error</h1>
        <p className="mt-3 text-sm text-slate-300">
          The error was logged without exposing secrets. Retry the workspace, then continue with official preflight sources if planning data is incomplete.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
