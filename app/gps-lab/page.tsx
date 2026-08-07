import type { Metadata } from 'next';
import HaloAuthNav from '@/components/auth/HaloAuthNav';
import HaloLogo from '@/components/shell/HaloLogo';
import { isSupabaseAuthConfigured } from '@/lib/supabase/config';
import { getSupabaseServerUserId } from '@/lib/supabase/server';
import GpsLabClient from './GpsLabClient';

export const metadata: Metadata = {
  title: 'Halo GPS Lab',
  description: 'Browser geolocation diagnostics for Halo Flight Planning.',
};

export default async function GpsLabPage() {
  if (!isSupabaseAuthConfigured()) {
    return <GpsLabAccessGate setupMissing />;
  }

  const userId = await getSupabaseServerUserId();

  if (!userId) {
    return <GpsLabAccessGate />;
  }

  return <GpsLabClient />;
}

function GpsLabAccessGate({ setupMissing = false }: { setupMissing?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4e8] px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <HaloLogo size="md" />
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            GPS lab protected
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {setupMissing ? 'Supabase auth setup required' : 'Sign in to open GPS Lab'}
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            {setupMissing
              ? 'Add Supabase auth environment variables before opening diagnostic tools.'
              : 'Use the same test pilot account as the planner.'}
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
