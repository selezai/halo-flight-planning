import { auth } from '@clerk/nextjs/server';
import AccountScopedPlanner from '@/components/auth/AccountScopedPlanner';
import HaloAuthNav from '@/components/auth/HaloAuthNav';
import HaloAppShell from '@/components/shell/HaloAppShell';
import HaloLogo from '@/components/shell/HaloLogo';
import TestPilotTracker from '@/components/testing/TestPilotTracker';
import { isClerkConfigured } from '@/lib/auth/accountAuth';
import {
  resolveTestPilotLinkContext,
  type TestPilotSearchParams,
} from '@/lib/testing/testPilotAccess';

type DashboardPageProps = {
  searchParams?: Promise<TestPilotSearchParams>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const testPilotContext = resolveTestPilotLinkContext((await searchParams) ?? {});

  if (!isClerkConfigured()) {
    return (
      <>
        {testPilotContext.enabled ? (
          <TestPilotTracker
            source={testPilotContext.source}
            pilotCode={testPilotContext.pilotCode}
          />
        ) : null}
        <HaloAppShell />
      </>
    );
  }

  const { userId } = await auth();

  if (!userId) {
    if (testPilotContext.enabled) {
      return (
        <>
          <TestPilotTracker
            source={testPilotContext.source}
            pilotCode={testPilotContext.pilotCode}
          />
          <HaloAppShell />
        </>
      );
    }

    return <PlannerAccessGate />;
  }

  return <AccountScopedPlanner userId={userId} />;
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
            Use email and password sign-up before accessing the planner. Google sign-in is hidden until production OAuth is configured.
          </p>
        </div>

        <HaloAuthNav variant="gate" className="mt-6" />
      </section>
    </main>
  );
}
