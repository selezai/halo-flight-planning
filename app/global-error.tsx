'use client';

import HaloRecoveryPanel from '@/components/system/HaloRecoveryPanel';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <HaloRecoveryPanel
          error={error}
          reset={reset}
          source="global-error-boundary"
          eyebrow="Halo could not recover this view"
          title="Reload required"
          description="The failure has been sent to Halo's safe client-error log. Use repair first; if the browser still cannot boot Halo, reset only Halo's local app data."
        />
      </body>
    </html>
  );
}
