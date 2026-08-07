import HaloAuthNav from '@/components/auth/HaloAuthNav';
import HaloAppShell from '@/components/shell/HaloAppShell';
import HaloLogo from '@/components/shell/HaloLogo';
import { isSupabaseAuthConfigured } from '@/lib/supabase/config';
import { getSupabaseServerUserId } from '@/lib/supabase/server';

export default async function DashboardPage() {
  if (!isSupabaseAuthConfigured()) {
    return <PlannerAccessGate setupMissing />;
  }

  const userId = await getSupabaseServerUserId();

  if (!userId) {
    return <PlannerAccessGate />;
  }

  return <HaloAppShell />;
}

function PlannerAccessGate({ setupMissing = false }: { setupMissing?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4e8] px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <HaloLogo size="md" />

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            Pilot account required
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {setupMissing ? 'Supabase auth setup required' : 'Sign in to open Halo Flight Planning'}
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            {setupMissing
              ? 'Add Supabase URL and publishable key environment variables before test pilots can access the planner.'
              : 'Use email and password sign-up before accessing the planner.'}
          </p>
        </div>

        {setupMissing ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            Required Vercel env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
          </div>
        ) : (
          <HaloAuthNav variant="gate" className="mt-6" />
        )}
      </section>
    </main>
  );
}
