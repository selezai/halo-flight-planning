import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabaseAuthConfig } from '@/lib/supabase/config';

export async function createSupabaseServerClient() {
  const { url, publishableKey } = requireSupabaseAuthConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware refreshes sessions.
        }
      },
    },
  });
}

export async function getSupabaseServerUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}
