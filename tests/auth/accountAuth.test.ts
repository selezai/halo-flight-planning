import { afterEach, describe, expect, it } from 'vitest';
import { isClerkConfigured, requireAccountUserId } from '@/lib/auth/accountAuth';

const originalPublicKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const originalSecretKey = process.env.CLERK_SECRET_KEY;

describe('account auth guard', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('treats missing or blank Clerk keys as unconfigured', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = '   ';
    process.env.CLERK_SECRET_KEY = 'sk_test_example';

    expect(isClerkConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_example';
    process.env.CLERK_SECRET_KEY = '';

    expect(isClerkConfigured()).toBe(false);
  });

  it('returns a setup response instead of importing Clerk when keys are missing', async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;

    await expect(requireAccountUserId()).resolves.toEqual({
      ok: false,
      status: 503,
      error: 'Account sync is not configured. Finish Clerk setup before using cloud sync.',
    });
  });
});

function restoreEnv() {
  if (originalPublicKey === undefined) {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublicKey;
  }

  if (originalSecretKey === undefined) {
    delete process.env.CLERK_SECRET_KEY;
  } else {
    process.env.CLERK_SECRET_KEY = originalSecretKey;
  }
}
