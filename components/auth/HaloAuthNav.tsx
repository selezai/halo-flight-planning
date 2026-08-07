'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, UserCircle, UserPlus } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSupabaseAuthState } from '@/components/auth/useSupabaseAuthState';
import { cn } from '@/lib/utils';

type AuthMode = 'sign-in' | 'sign-up';

export default function HaloAuthNav({
  variant = 'toolbar',
  className,
}: {
  variant?: 'toolbar' | 'gate';
  className?: string;
}) {
  const router = useRouter();
  const { authConfigured, isLoaded, isSignedIn, supabase, user } = useSupabaseAuthState();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [open, setOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const gate = variant === 'gate';

  const openAuth = (nextMode: AuthMode) => {
    setMode(nextMode);
    setOpen(true);
  };

  const signOut = async () => {
    if (!supabase) return;
    setSignOutBusy(true);
    await supabase.auth.signOut();
    setSignOutBusy(false);
    router.refresh();
  };

  if (!authConfigured) {
    return (
      <nav
        aria-label="Account"
        className={cn(
          gate ? 'grid grid-cols-1 gap-2' : 'flex items-center gap-1.5',
          className
        )}
      >
        <button
          type="button"
          disabled
          className={cn(
            'inline-flex items-center justify-center gap-2 font-semibold text-slate-500 opacity-70',
            gate
              ? 'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm'
              : 'min-h-9 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs'
          )}
        >
          <UserCircle className="h-4 w-4" />
          Auth setup needed
        </button>
      </nav>
    );
  }

  if (isLoaded && isSignedIn) {
    const userLabel = user?.email ?? 'Signed-in pilot';

    return (
      <nav
        aria-label="Account"
        className={cn(
          gate ? 'grid grid-cols-1 gap-2' : 'flex items-center gap-1.5',
          className
        )}
      >
        <div
          className={cn(
            'inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/75 font-semibold text-slate-800',
            gate ? 'min-h-11 px-4 py-2 text-sm' : 'min-h-9 max-w-[11rem] px-3 py-1.5 text-xs'
          )}
        >
          <UserCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{userLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signOutBusy}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
            gate
              ? 'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50'
              : 'min-h-9 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-800 hover:bg-white'
          )}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </nav>
    );
  }

  return (
    <>
      <nav
        aria-label="Account"
        className={cn(
          gate ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'flex items-center gap-1.5',
          className
        )}
      >
        <button
          type="button"
          onClick={() => openAuth('sign-in')}
          disabled={!isLoaded}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
            gate
              ? 'min-h-11 rounded-xl bg-slate-950 px-4 py-2 text-sm text-white hover:bg-slate-800'
              : 'min-h-9 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-800 hover:bg-white'
          )}
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </button>
        <button
          type="button"
          onClick={() => openAuth('sign-up')}
          disabled={!isLoaded}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
            gate
              ? 'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50'
              : 'min-h-9 rounded-xl bg-slate-950 px-3 py-1.5 text-xs text-white hover:bg-slate-800'
          )}
        >
          <UserPlus className="h-4 w-4" />
          Sign up
        </button>
      </nav>

      <EmailPasswordAuthDialog
        mode={mode}
        open={open}
        onModeChange={setMode}
        onOpenChange={setOpen}
        supabase={supabase}
      />
    </>
  );
}

function EmailPasswordAuthDialog({
  mode,
  open,
  onModeChange,
  onOpenChange,
  supabase,
}: {
  mode: AuthMode;
  open: boolean;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseClient | null;
}) {
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const signingUp = mode === 'sign-up';

  const resetLocalState = () => {
    setEmailAddress('');
    setPassword('');
    setBusy(false);
    setMessage(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    onModeChange(nextMode);
    resetLocalState();
  };

  const finishAuth = () => {
    onOpenChange(false);
    resetLocalState();
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setMessage('Supabase auth is not configured yet.');
      return;
    }

    setBusy(true);
    setMessage(null);

    if (signingUp) {
      const { data, error } = await supabase.auth.signUp({
        email: emailAddress,
        password,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
        },
      });

      setBusy(false);

      if (error) {
        setMessage(getAuthErrorMessage(error));
        return;
      }

      if (data.session) {
        finishAuth();
        return;
      }

      setMessage('Check your email to confirm the test pilot account, then return to Halo.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailAddress,
      password,
    });

    setBusy(false);

    if (error) {
      setMessage(getAuthErrorMessage(error));
      return;
    }

    finishAuth();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetLocalState();
      }}
    >
      <DialogContent className="rounded-[1.5rem] border-white/70 bg-white/95 p-0 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:max-w-md">
        <DialogHeader className="border-b border-slate-200/70 px-5 py-4 pr-12">
          <DialogTitle>{signingUp ? 'Create test pilot account' : 'Sign in to Halo'}</DialogTitle>
          <DialogDescription>
            Email and password only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('sign-in')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold transition',
                mode === 'sign-in' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('sign-up')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold transition',
                mode === 'sign-up' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-cyan-400/40 transition focus:border-cyan-300 focus:ring-2"
                placeholder="pilot@example.com"
                required
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
              <span>Password</span>
              <input
                type="password"
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-cyan-400/40 transition focus:border-cyan-300 focus:ring-2"
                placeholder={signingUp ? 'Create a password' : 'Enter your password'}
                minLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {signingUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {signingUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {message ? (
            <p className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-medium leading-5 text-cyan-900">
              {message}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getEmailRedirectTo(): string {
  return `${window.location.origin}/auth/confirm?next=/`;
}

function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'Authentication failed.';

  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    const record = error as { message?: unknown };
    if (typeof record.message === 'string') return record.message;
  }

  return 'Authentication failed. Check the email, password, and Supabase settings.';
}
