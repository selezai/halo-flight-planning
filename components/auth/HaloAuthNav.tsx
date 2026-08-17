'use client';

import { useState, type FormEvent } from 'react';
import { Show, UserButton, useSignIn, useSignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, MailCheck, PlaneTakeoff, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TEST_PILOT_CONTINUE_HREF } from '@/lib/testing/testPilotAccess';
import { cn } from '@/lib/utils';

type AuthMode = 'sign-in' | 'sign-up';
type SignUpStep = 'credentials' | 'verify-email';
type SignInStep = 'credentials' | 'verify-email';

const USER_BUTTON_APPEARANCE = {
  elements: {
    avatarBox: 'h-8 w-8',
  },
};

export default function HaloAuthNav({
  variant = 'toolbar',
  className,
}: {
  variant?: 'toolbar' | 'gate';
  className?: string;
}) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [open, setOpen] = useState(false);
  const gate = variant === 'gate';

  const openAuth = (nextMode: AuthMode) => {
    setMode(nextMode);
    setOpen(true);
  };

  return (
    <>
      <nav
        aria-label="Account"
        className={cn(
          gate ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'flex items-center gap-1.5',
          className
        )}
      >
        <Show when="signed-out">
          <button
            type="button"
            onClick={() => openAuth('sign-in')}
            className={cn(
              'inline-flex items-center justify-center gap-2 font-semibold transition',
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
            className={cn(
              'inline-flex items-center justify-center gap-2 font-semibold transition',
              gate
                ? 'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50'
                : 'min-h-9 rounded-xl bg-slate-950 px-3 py-1.5 text-xs text-white hover:bg-slate-800'
            )}
          >
            <UserPlus className="h-4 w-4" />
            Sign up
          </button>
          {gate ? (
            <Link
              href={TEST_PILOT_CONTINUE_HREF}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-100 sm:col-span-2"
            >
              <PlaneTakeoff className="h-4 w-4" />
              Continue as test pilot
            </Link>
          ) : null}
        </Show>
        <Show when="signed-in">
          <UserButton appearance={USER_BUTTON_APPEARANCE} />
        </Show>
      </nav>

      <EmailPasswordAuthDialog
        mode={mode}
        open={open}
        onModeChange={setMode}
        onOpenChange={setOpen}
      />
    </>
  );
}

function EmailPasswordAuthDialog({
  mode,
  open,
  onModeChange,
  onOpenChange,
}: {
  mode: AuthMode;
  open: boolean;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { signIn, errors: signInErrors, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpFetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('credentials');
  const [signInStep, setSignInStep] = useState<SignInStep>('credentials');
  const [message, setMessage] = useState<string | null>(null);

  const busy = signInFetchStatus === 'fetching' || signUpFetchStatus === 'fetching';
  const signingUp = mode === 'sign-up';
  const verifying = signingUp ? signUpStep === 'verify-email' : signInStep === 'verify-email';

  const resetLocalState = () => {
    setEmailAddress('');
    setPassword('');
    setVerificationCode('');
    setSignUpStep('credentials');
    setSignInStep('credentials');
    setMessage(null);
  };

  const switchMode = async (nextMode: AuthMode) => {
    onModeChange(nextMode);
    resetLocalState();
    await Promise.all([
      signIn.reset(),
      signUp.reset(),
    ]);
  };

  const finishAuth = async () => {
    onOpenChange(false);
    resetLocalState();
    router.refresh();
  };

  const handleSignUpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const { error } = await signUp.password({
      emailAddress,
      password,
    });

    if (error) {
      setMessage(getClerkErrorMessage(error));
      return;
    }

    const verification = await signUp.verifications.sendEmailCode();
    if (verification.error) {
      setMessage(getClerkErrorMessage(verification.error));
      return;
    }

    setSignUpStep('verify-email');
    setMessage('Check your email for the verification code.');
  };

  const handleSignUpVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const { error } = await signUp.verifications.verifyEmailCode({
      code: verificationCode,
    });

    if (error) {
      setMessage(getClerkErrorMessage(error));
      return;
    }

    if (signUp.status === 'complete') {
      const finalized = await signUp.finalize();
      if (finalized.error) {
        setMessage(getClerkErrorMessage(finalized.error));
        return;
      }

      await finishAuth();
      return;
    }

    setMessage('Verification was accepted, but sign-up still needs one more required step.');
  };

  const handleSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const { error } = await signIn.password({
      emailAddress,
      password,
    });

    if (error) {
      setMessage(getClerkErrorMessage(error));
      return;
    }

    if (signIn.status === 'complete') {
      const finalized = await signIn.finalize();
      if (finalized.error) {
        setMessage(getClerkErrorMessage(finalized.error));
        return;
      }

      await finishAuth();
      return;
    }

    if (signIn.status === 'needs_client_trust') {
      const verification = await signIn.mfa.sendEmailCode();
      if (verification.error) {
        setMessage(getClerkErrorMessage(verification.error));
        return;
      }

      setSignInStep('verify-email');
      setMessage('Check your email for the verification code.');
      return;
    }

    setMessage('This account needs another verification step before sign-in can finish.');
  };

  const handleSignInVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const { error } = await signIn.mfa.verifyEmailCode({
      code: verificationCode,
    });

    if (error) {
      setMessage(getClerkErrorMessage(error));
      return;
    }

    if (signIn.status === 'complete') {
      const finalized = await signIn.finalize();
      if (finalized.error) {
        setMessage(getClerkErrorMessage(finalized.error));
        return;
      }

      await finishAuth();
      return;
    }

    setMessage('Verification was accepted, but sign-in still needs one more required step.');
  };

  const resendCode = async () => {
    setMessage(null);
    const { error } = signingUp
      ? await signUp.verifications.sendEmailCode()
      : await signIn.mfa.sendEmailCode();

    setMessage(error ? getClerkErrorMessage(error) : 'A new code was sent.');
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
          <DialogTitle>{signingUp ? 'Create pilot account' : 'Sign in to Halo'}</DialogTitle>
          <DialogDescription>
            Email and password only. Google sign-in is hidden until production OAuth is configured.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => void switchMode('sign-in')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold transition',
                mode === 'sign-in' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => void switchMode('sign-up')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold transition',
                mode === 'sign-up' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Sign up
            </button>
          </div>

          {verifying ? (
            <form onSubmit={signingUp ? handleSignUpVerify : handleSignInVerify} className="space-y-3">
              <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                <span>Email code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-cyan-400/40 transition focus:border-cyan-300 focus:ring-2"
                  placeholder="Enter verification code"
                  required
                />
              </label>
              {getFieldMessage(signingUp ? signUpErrors.fields.code : signInErrors.fields.code)}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <MailCheck className="h-4 w-4" />
                Verify email
              </button>
              <button
                type="button"
                onClick={() => void resendCode()}
                disabled={busy}
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
              >
                Send a new code
              </button>
            </form>
          ) : (
            <form onSubmit={signingUp ? handleSignUpSubmit : handleSignInSubmit} className="space-y-3">
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
              {getFieldMessage(signingUp ? signUpErrors.fields.emailAddress : signInErrors.fields.identifier)}
              <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete={signingUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-cyan-400/40 transition focus:border-cyan-300 focus:ring-2"
                  placeholder={signingUp ? 'Create a password' : 'Enter your password'}
                  required
                />
              </label>
              {getFieldMessage(signingUp ? signUpErrors.fields.password : signInErrors.fields.password)}
              {signingUp ? <div id="clerk-captcha" /> : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {signingUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {signingUp ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}

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

function getFieldMessage(field: { message?: string } | null | undefined) {
  return field?.message ? (
    <p className="text-xs font-medium text-rose-700">{field.message}</p>
  ) : null;
}

function getClerkErrorMessage(error: unknown): string {
  if (!error) return 'Authentication failed.';

  if (typeof error === 'object') {
    const record = error as {
      message?: unknown;
      longMessage?: unknown;
      errors?: Array<{ message?: string; longMessage?: string }>;
    };
    const nestedMessage = record.errors?.[0]?.longMessage ?? record.errors?.[0]?.message;
    if (nestedMessage) return nestedMessage;
    if (typeof record.longMessage === 'string') return record.longMessage;
    if (typeof record.message === 'string') return record.message;
  }

  return 'Authentication failed. Check the email, password, and Clerk settings.';
}
