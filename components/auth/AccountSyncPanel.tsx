'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut, Save, UserCircle2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  createAccountSnapshot,
  type HaloAccountSnapshot,
} from '@/lib/supabase/accountSnapshot';
import { useMapStore } from '@/stores/mapStore';

type SaveState = 'idle' | 'loading' | 'done' | 'error';

export default function AccountSyncPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [cloudSnapshot, setCloudSnapshot] = useState<HaloAccountSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const plannerState = useMapStore((state) => ({
    routeName: state.routeName,
    routeNotes: state.routeNotes,
    departureTime: state.departureTime,
    cruiseAltitudeFt: state.cruiseAltitudeFt,
    waypoints: state.waypoints,
    activeAircraft: state.activeAircraft,
    personalMinimums: state.personalMinimums,
    visibleLayers: state.visibleLayers,
  }));
  const loadAccountSnapshot = useMapStore((state) => state.loadAccountSnapshot);

  const refreshCloudSnapshot = useCallback(async () => {
    setLoadingSnapshot(true);
    try {
      const response = await fetch('/api/account/snapshot', {
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Cloud planner load failed.');
      }

      setCloudSnapshot(payload.snapshot ?? null);
      if (!payload.snapshot && payload.message) setMessage(payload.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloud planner load failed.');
    } finally {
      setLoadingSnapshot(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        void refreshCloudSnapshot();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setMessage('Signed in. Save local planning data or load the cloud snapshot.');
        void refreshCloudSnapshot();
      } else {
        setCloudSnapshot(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [refreshCloudSnapshot, supabase]);

  const sendMagicLink = async () => {
    if (!supabase || !email.trim()) return;

    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setMessage(error ? error.message : 'Magic link sent. Check your email to finish sign-in.');
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setMessage(error.message);
  };

  const signOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setCloudSnapshot(null);
    setMessage('Signed out. Local planner data remains in this browser.');
  };

  const saveLocalSnapshot = async () => {
    setSaveState('loading');
    setMessage(null);

    try {
      const snapshot = createAccountSnapshot(plannerState);
      const response = await fetch('/api/account/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ snapshot }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Cloud planner save failed.');
      }

      setCloudSnapshot(payload.snapshot);
      setSaveState('done');
      setMessage('Local planner data saved to your account.');
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Cloud planner save failed.');
    }
  };

  if (!supabase) {
    return (
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Account sync is disabled until Supabase public env vars are configured.
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <UserCircle2 className="h-4 w-4" />
        {user?.email ?? 'Account sync'}
      </div>

      {user ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={saveLocalSnapshot}
            disabled={saveState === 'loading'}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-950 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saveState === 'loading' ? 'Saving...' : 'Save local'}
          </button>
          <button
            type="button"
            onClick={() => cloudSnapshot && loadAccountSnapshot(cloudSnapshot)}
            disabled={!cloudSnapshot || loadingSnapshot}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load cloud
          </button>
          <button
            type="button"
            onClick={refreshCloudSnapshot}
            disabled={loadingSnapshot}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {loadingSnapshot ? 'Checking...' : 'Check cloud'}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pilot@example.com"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-950 focus:outline-none"
            />
            <button
              type="button"
              onClick={sendMagicLink}
              className="rounded-md bg-slate-950 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Magic link
            </button>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
          >
            Continue with Google
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
      {cloudSnapshot?.updatedAt && (
        <p className="mt-1 text-[11px] text-slate-500">
          Cloud snapshot: {new Date(cloudSnapshot.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
