export function getConfiguredEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return undefined;
  return trimmed;
}

export function getSupabaseUrl(): string | undefined {
  return getConfiguredEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    getConfiguredEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    getConfiguredEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function requireSupabaseAuthConfig(): { url: string; publishableKey: string } {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return { url, publishableKey };
}
