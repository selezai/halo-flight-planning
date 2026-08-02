'use client';

import HaloRecoveryPanel from '@/components/system/HaloRecoveryPanel';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <HaloRecoveryPanel
      error={error}
      reset={reset}
      source="app-error-boundary"
      eyebrow="Halo encountered an error"
      title="Reload the planner"
      description="The failure has been sent to Halo's safe client-error log. If it repeats, repair the app cache or reset only Halo's local planner data from here."
    />
  );
}
