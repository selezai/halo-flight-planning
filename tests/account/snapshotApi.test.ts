import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { buildPlannerSnapshotPayload } from '@/lib/account/plannerSnapshot';

describe('account snapshot API route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('requires an authenticated Clerk user before reading a snapshot', async () => {
    const { GET, getAccountPlannerSnapshot } = await loadRouteWithMocks({
      authResult: { ok: false, status: 401, error: 'Sign in to sync Halo planner data.' },
      databaseConfigured: true,
    });

    const response = await GET(new NextRequest('https://halo.test/api/account/snapshot'), {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Sign in to sync Halo planner data.' });
    expect(getAccountPlannerSnapshot).not.toHaveBeenCalled();
  });

  it('returns a setup error when Neon is not configured', async () => {
    const { PUT, upsertAccountPlannerSnapshot } = await loadRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: false,
    });

    const response = await PUT(new NextRequest('https://halo.test/api/account/snapshot', {
      method: 'PUT',
      body: JSON.stringify(buildPlannerSnapshotPayload({ routeName: 'Local' })),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain('database is not configured');
    expect(upsertAccountPlannerSnapshot).not.toHaveBeenCalled();
  });

  it('validates snapshot payloads before saving', async () => {
    const { PUT, upsertAccountPlannerSnapshot } = await loadRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
    });

    const response = await PUT(new NextRequest('https://halo.test/api/account/snapshot', {
      method: 'PUT',
      body: JSON.stringify({ state: { unexpected: true } }),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Planner snapshot is invalid.' });
    expect(upsertAccountPlannerSnapshot).not.toHaveBeenCalled();
  });

  it('saves a valid snapshot against the authenticated user only', async () => {
    const snapshot = buildPlannerSnapshotPayload(
      { routeName: 'FAOR-FALA' },
      new Date('2026-07-20T10:00:00Z')
    );
    const stored = {
      userId: 'user_123',
      snapshot,
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-20T10:00:00.000Z',
    };
    const { PUT, upsertAccountPlannerSnapshot } = await loadRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
      savedSnapshot: stored,
    });

    const response = await PUT(new NextRequest('https://halo.test/api/account/snapshot', {
      method: 'PUT',
      body: JSON.stringify(snapshot),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ snapshot: stored });
    expect(upsertAccountPlannerSnapshot).toHaveBeenCalledWith('user_123', snapshot);
  });

  it('returns the current authenticated user snapshot', async () => {
    const snapshot = buildPlannerSnapshotPayload(
      { routeName: 'Cloud route' },
      new Date('2026-07-20T10:00:00Z')
    );
    const stored = {
      userId: 'user_123',
      snapshot,
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-20T10:00:00.000Z',
    };
    const { GET, getAccountPlannerSnapshot } = await loadRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
      storedSnapshot: stored,
    });

    const response = await GET(new NextRequest('https://halo.test/api/account/snapshot'), {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ snapshot: stored });
    expect(getAccountPlannerSnapshot).toHaveBeenCalledWith('user_123');
  });
});

async function loadRouteWithMocks({
  authResult,
  databaseConfigured,
  storedSnapshot = null,
  savedSnapshot = storedSnapshot,
}: {
  authResult: { ok: true; userId: string } | { ok: false; status: 401 | 503; error: string };
  databaseConfigured: boolean;
  storedSnapshot?: unknown;
  savedSnapshot?: unknown;
}) {
  vi.resetModules();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const requireAccountUserId = vi.fn().mockResolvedValue(authResult);
  const getAccountPlannerSnapshot = vi.fn().mockResolvedValue(storedSnapshot);
  const upsertAccountPlannerSnapshot = vi.fn().mockResolvedValue(savedSnapshot);
  const isAccountDatabaseConfigured = vi.fn().mockReturnValue(databaseConfigured);

  vi.doMock('@/lib/auth/accountAuth', () => ({
    requireAccountUserId,
  }));
  vi.doMock('@/lib/account/snapshotRepository', () => ({
    getAccountPlannerSnapshot,
    isAccountDatabaseConfigured,
    upsertAccountPlannerSnapshot,
  }));

  const route = await import('@/app/api/account/snapshot/route');

  return {
    ...route,
    requireAccountUserId,
    getAccountPlannerSnapshot,
    upsertAccountPlannerSnapshot,
    isAccountDatabaseConfigured,
  };
}
