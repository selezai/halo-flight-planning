import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { LogIn, UserPlus } from 'lucide-react';
import HaloAppShell from '@/components/shell/HaloAppShell';
import HaloLogo from '@/components/shell/HaloLogo';
import { isClerkConfigured } from '@/lib/auth/accountAuth';

export default async function DashboardPage() {
  if (!isClerkConfigured()) {
    return <HaloAppShell />;
  }

  const { userId } = await auth();

  if (!userId) {
    return <PlannerAccessGate />;
  }

  return <HaloAppShell />;
}

function PlannerAccessGate() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4e8] px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <HaloLogo size="md" />

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            Pilot account required
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Sign in to open Halo Flight Planning
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Use email sign-up or Google OAuth from the secure Clerk account window before accessing the planner.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SignInButton mode="modal">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <UserPlus className="h-4 w-4" />
              Create account
            </button>
          </SignUpButton>
        </div>
      </section>
    </main>
  );
}
