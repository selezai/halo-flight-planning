'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: 'error',
      message: 'global_error_boundary',
      error: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <section className="max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-300">
              Halo could not recover this view
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Reload required</h1>
            <p className="mt-3 text-sm text-slate-300">
              The failure was logged without exposing secrets. Try reloading the planner.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-xs text-slate-500">Digest: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
