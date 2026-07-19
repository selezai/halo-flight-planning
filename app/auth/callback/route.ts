import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeRedirectPath(requestUrl.searchParams.get('next'));
  const redirectTo = new URL(next, requestUrl.origin);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectTo.searchParams.set('auth', 'not-configured');
    return NextResponse.redirect(redirectTo);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirectTo.searchParams.set('auth', 'callback-error');
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(redirectTo);
}

function safeRedirectPath(value: string | null): string {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}
