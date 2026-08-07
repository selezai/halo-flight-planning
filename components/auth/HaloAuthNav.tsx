'use client';

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const gate = variant === 'gate';

  return (
    <nav
      aria-label="Account"
      className={cn(
        gate ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'flex items-center gap-1.5',
        className
      )}
    >
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
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
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
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
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton appearance={USER_BUTTON_APPEARANCE} />
      </Show>
    </nav>
  );
}
