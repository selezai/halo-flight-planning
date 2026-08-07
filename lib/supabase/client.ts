'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAuthConfig } from '@/lib/supabase/config';

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = requireSupabaseAuthConfig();
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
