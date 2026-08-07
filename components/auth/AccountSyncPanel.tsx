'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  DownloadCloud,
  LogOut,
  RefreshCcw,
  UploadCloud,
  UserCircle,
} from 'lucide-react';
import HaloAuthNav from '@/components/auth/HaloAuthNav';
import { useSupabaseAuthState } from '@/components/auth/useSupabaseAuthState';
import {
  buildPlannerSnapshotPayload,
  extractPlannerSnapshotState,
  mergePlannerSnapshotStates,
  type StoredPlannerSnapshot,
} from '@/lib/account/plannerSnapshot';
import { useMapStore } from '@/stores/mapStore';

interface AccountSyncPanelProps {
  enabled: boolean;
}

type SyncTone = 'idle' | 'loading' | 'success' | 'error';

interface SyncMessage {
  tone: SyncTone;
  text: string;
}

interface SnapshotApiResponse {
  snapshot: StoredPlannerSnapshot | null;
  error?: string;
}

export default function AccountSyncPanel({ enabled }: AccountSyncPanelProps) {
  if (!enabled) {
    return (
      <div className="border-b border-slate-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Local-only mode</p>
            <p className="mt-1 text-amber-800">
              Finish Supabase auth and Neon setup to enable account sync.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <SupabaseAccountSyncPanel />;
}

function SupabaseAccountSyncPanel() {
  const router = useRouter();
  const { authConfigured, isLoaded, isSignedIn, supabase, user } = useSupabaseAuthState();
  const restorePlannerSnapshotState = useMapStore((state) => state.restorePlannerSnapshotState);
  const [remoteSnapshot, setRemoteSnapshot] = useState<StoredPlannerSnapshot | null>(null);
  const [message, setMessage] = useState<SyncMessage>({
    tone: 'idle',
    text: 'Sign in to sync this planner across devices.',
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadRemoteSnapshot = useCallback(async () => {
    setBusyAction('refresh');
    setMessage({ tone: 'loading', text: 'Checking account snapshot…' });

    try {
      const response = await fetch('/api/account/snapshot', {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = await parseSnapshotResponse(response);

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load account snapshot.');
      }

      setRemoteSnapshot(payload.snapshot);
      setMessage({
        tone: 'success',
        text: payload.snapshot
          ? `Account snapshot updated ${formatTimestamp(payload.snapshot.updatedAt)}.`
          : 'No account snapshot yet. Save this planner to create one.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not load account snapshot.',
      });
    } finally {
      setBusyAction(null);
    }
  }, []);

  useEffect(() => {
    if (authConfigured && isLoaded && isSignedIn) {
      void loadRemoteSnapshot();
    }
  }, [authConfigured, isLoaded, isSignedIn, loadRemoteSnapshot]);

  const saveCurrentPlanner = useCallback(async () => {
    setBusyAction('save');
    setMessage({ tone: 'loading', text: 'Saving this planner to your account…' });

    try {
      const snapshot = buildPlannerSnapshotPayload(useMapStore.getState() as unknown as Record<string, unknown>);
      const response = await fetch('/api/account/snapshot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      const payload = await parseSnapshotResponse(response);

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error || 'Could not save account snapshot.');
      }

      setRemoteSnapshot(payload.snapshot);
      setMessage({
        tone: 'success',
        text: `Saved to account ${formatTimestamp(payload.snapshot.updatedAt)}.`,
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not save account snapshot.',
      });
    } finally {
      setBusyAction(null);
    }
  }, []);

  const restoreFromAccount = useCallback(() => {
    if (!remoteSnapshot) return;
    restorePlannerSnapshotState(remoteSnapshot.snapshot.state);
    setMessage({
      tone: 'success',
      text: 'Loaded the account snapshot into this planner.',
    });
  }, [remoteSnapshot, restorePlannerSnapshotState]);

  const mergeAndSave = useCallback(async () => {
    if (!remoteSnapshot) return;
    setBusyAction('merge');
    setMessage({ tone: 'loading', text: 'Merging local and account data…' });

    try {
      const localState = extractPlannerSnapshotState(useMapStore.getState() as unknown as Record<string, unknown>);
      const mergedState = mergePlannerSnapshotStates(localState, remoteSnapshot.snapshot.state);

      restorePlannerSnapshotState(mergedState);

      const response = await fetch('/api/account/snapshot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPlannerSnapshotPayload(mergedState)),
      });
      const payload = await parseSnapshotResponse(response);

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error || 'Could not save merged snapshot.');
      }

      setRemoteSnapshot(payload.snapshot);
      setMessage({
        tone: 'success',
        text: 'Merged local and account data, then saved the result.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not merge account snapshot.',
      });
    } finally {
      setBusyAction(null);
    }
  }, [remoteSnapshot, restorePlannerSnapshotState]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setBusyAction('signout');
    setMessage({ tone: 'loading', text: 'Signing out…' });

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage({ tone: 'error', text: error.message });
      setBusyAction(null);
      return;
    }

    setRemoteSnapshot(null);
    setBusyAction(null);
    setMessage({ tone: 'idle', text: 'Sign in to sync this planner across devices.' });
    router.refresh();
  }, [router, supabase]);

  if (!authConfigured) {
    return (
      <div className="border-b border-slate-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Account auth not configured</p>
            <p className="mt-1 text-amber-800">
              Add Supabase auth env vars before using cloud sync.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Loading account sync…
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs">
        <div className="flex items-start gap-2 text-slate-700">
          <Cloud className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">Account sync</p>
            <p className="mt-1">Halo works locally. Sign in to sync saved planner data.</p>
          </div>
        </div>
        <HaloAuthNav variant="gate" className="mt-3" />
      </div>
    );
  }

  const actionDisabled = Boolean(busyAction);
  const userLabel = user?.email ?? 'Signed-in pilot';

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <Cloud className="h-4 w-4" />
            <p className="font-semibold">Account sync</p>
          </div>
          <p className="mt-1 truncate text-slate-600">{userLabel}</p>
        </div>
        <UserCircle className="h-7 w-7 flex-shrink-0 text-slate-500" />
      </div>

      <p className={`mt-2 flex items-start gap-1.5 ${getMessageToneClass(message.tone)}`}>
        {message.tone === 'success' ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        ) : message.tone === 'error' ? (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <RefreshCcw className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${message.tone === 'loading' ? 'animate-spin' : ''}`} />
        )}
        <span>{message.text}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={saveCurrentPlanner}
          disabled={actionDisabled}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-950 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          Save
        </button>
        <button
          type="button"
          onClick={loadRemoteSnapshot}
          disabled={actionDisabled}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
        <button
          type="button"
          onClick={restoreFromAccount}
          disabled={actionDisabled || !remoteSnapshot}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadCloud className="h-3.5 w-3.5" />
          Load
        </button>
        <button
          type="button"
          onClick={mergeAndSave}
          disabled={actionDisabled || !remoteSnapshot}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Merge
        </button>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        disabled={actionDisabled}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut className="h-3 w-3" />
        Sign out
      </button>
    </div>
  );
}

async function parseSnapshotResponse(response: Response): Promise<SnapshotApiResponse> {
  try {
    return await response.json();
  } catch {
    return {
      snapshot: null,
      error: response.ok ? undefined : 'Account sync returned an invalid response.',
    };
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getMessageToneClass(tone: SyncTone): string {
  if (tone === 'success') return 'text-emerald-700';
  if (tone === 'error') return 'text-rose-700';
  if (tone === 'loading') return 'text-slate-700';
  return 'text-slate-600';
}
