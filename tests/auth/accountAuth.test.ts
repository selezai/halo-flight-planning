import { afterEach, describe, expect, it } from 'vitest';
import {
  getConfiguredEnvValue,
  requireAccountUserId,
} from '@/lib/auth/accountAuth';
import { isSupabaseAuthConfigured } from '@/lib/supabase/config';

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe('account auth guard', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('treats missing or blank Supabase auth keys as unconfigured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '   ';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(isSupabaseAuthConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://halo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '';

    expect(isSupabaseAuthConfigured()).toBe(false);
  });

  it('treats empty quoted placeholders as unconfigured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '""';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getConfiguredEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)).toBeUndefined();
    expect(isSupabaseAuthConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://halo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "''";

    expect(isSupabaseAuthConfigured()).toBe(false);
  });

  it('supports the legacy public anon key name when a publishable key is not present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://halo.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_example';

    expect(isSupabaseAuthConfigured()).toBe(true);
  });

  it('returns a setup response instead of creating a Supabase client when keys are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(requireAccountUserId()).resolves.toEqual({
      ok: false,
      status: 503,
      error: 'Account sync is not configured. Finish Supabase setup before using cloud sync.',
    });
  });
});

function restoreEnv() {
  restoreEnvValue('NEXT_PUBLIC_SUPABASE_URL', originalSupabaseUrl);
  restoreEnvValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', originalSupabasePublishableKey);
  restoreEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', originalSupabaseAnonKey);
}

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
