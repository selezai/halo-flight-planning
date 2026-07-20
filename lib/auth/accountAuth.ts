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

export function getConfiguredEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return undefined;
  return trimmed;
}

export function isPublicClerkConfigured(): boolean {
  return Boolean(getConfiguredEnvValue(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY));
}

export function isClerkConfigured(): boolean {
  return Boolean(
    getConfiguredEnvValue(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    getConfiguredEnvValue(process.env.CLERK_SECRET_KEY)
  );
}

export async function requireAccountUserId(): Promise<AccountAuthResult> {
  if (!isClerkConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Account sync is not configured. Finish Clerk setup before using cloud sync.',
    };
  }

  let userId: string | null;
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const session = await auth();
    userId = session.userId;
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Account sync authentication is unavailable. Check Clerk configuration.',
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
