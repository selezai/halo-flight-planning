import { getConfiguredEnvValue, isSupabaseAuthConfigured } from '@/lib/supabase/config';
import { getSupabaseServerUserId } from '@/lib/supabase/server';

export interface AccountAuthSuccess {
  ok: true;
  userId: string;
}

export interface AccountAuthFailure {
  ok: false;
  status: 401 | 503;
  error: string;
}

export type AccountAuthResult = AccountAuthSuccess | AccountAuthFailure;

export { getConfiguredEnvValue };

export async function requireAccountUserId(): Promise<AccountAuthResult> {
  if (!isSupabaseAuthConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Account sync is not configured. Finish Supabase setup before using cloud sync.',
    };
  }

  let userId: string | null = null;
  try {
    userId = await getSupabaseServerUserId();
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Account sync authentication is unavailable. Check Supabase configuration.',
    };
  }

  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: 'Sign in to sync Halo planner data.',
    };
  }

  return { ok: true, userId };
}
