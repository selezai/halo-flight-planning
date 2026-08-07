'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseAuthConfigured } from '@/lib/supabase/config';

export interface SupabaseAuthState {
  authConfigured: boolean;
  error: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  supabase: SupabaseClient | null;
  user: User | null;
}

export function useSupabaseAuthState(): SupabaseAuthState {
  const authConfigured = isSupabaseAuthConfigured();
  const supabase = useMemo(() => {
    if (!authConfigured) return null;
    return createSupabaseBrowserClient();
  }, [authConfigured]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(!authConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setIsLoaded(true);
      return undefined;
    }

    let active = true;

    supabase.auth.getUser().then(({ data, error: getUserError }) => {
      if (!active) return;
      setUser(data.user);
      setError(getUserError ? getAuthStateErrorMessage(getUserError) : null);
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setError(null);
      setIsLoaded(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    authConfigured,
    error,
    isLoaded,
    isSignedIn: Boolean(user),
    supabase,
    user,
  };
}

function getAuthStateErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Could not load the signed-in pilot.';
}
