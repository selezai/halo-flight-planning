import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Waypoint } from '@/types/planning';

const originalProviderUrl = process.env.HALO_NAVDATA_PROVIDER_URL;
const originalProviderKey = process.env.HALO_NAVDATA_PROVIDER_KEY;

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo',
  coordinates: [28.246, -26.1337],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  coordinates: [27.9261, -25.9385],
};

describe('route intelligence candidates API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.env.HALO_NAVDATA_PROVIDER_URL = originalProviderUrl;
    process.env.HALO_NAVDATA_PROVIDER_KEY = originalProviderKey;
  });

  it('rejects unauthenticated requests before route candidate logic', async () => {
    const { POST, requireAccountUserId } = await loadRouteWithAuth({
      ok: false,
      status: 401,
      error: 'Sign in to sync Halo planner data.',
    });

    const response = await POST(request({ waypoints: [faor, fala] }), {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Sign in to sync Halo planner data.' });
    expect(requireAccountUserId).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid request bodies', async () => {
    const { POST } = await loadRouteWithAuth({ ok: true, userId: 'user_123' });

    const response = await POST(request({ waypoints: [{ id: 'bad' }] }), {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Route intelligence request is invalid.' });
  });

  it('returns an explicit provider-not-configured route candidate without fabricating navdata', async () => {
    delete process.env.HALO_NAVDATA_PROVIDER_URL;
    delete process.env.HALO_NAVDATA_PROVIDER_KEY;
    const { POST } = await loadRouteWithAuth({ ok: true, userId: 'user_123' });

    const response = await POST(request({
      routeText: 'FAOR V12 RNAV03 FALA',
      waypoints: [faor, fala],
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.review.status).toBe('provider-not-configured');
    expect(payload.review.candidates.find((candidate: { id: string }) => candidate.id === 'provider-route')).toMatchObject({
      status: 'provider-not-configured',
      waypoints: [],
    });
  });

  it('does not expose configured provider secrets in responses', async () => {
    process.env.HALO_NAVDATA_PROVIDER_URL = 'https://provider.example.test';
    process.env.HALO_NAVDATA_PROVIDER_KEY = 'super-secret-provider-key';
    const { POST } = await loadRouteWithAuth({ ok: true, userId: 'user_123' });

    const response = await POST(request({ waypoints: [faor, fala] }), {});
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain('super-secret-provider-key');
    expect(text).not.toContain('provider.example.test');
  });
});

async function loadRouteWithAuth(
  authResult:
    | { ok: true; userId: string }
    | { ok: false; status: 401 | 503; error: string }
) {
  vi.resetModules();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const requireAccountUserId = vi.fn().mockResolvedValue(authResult);
  vi.doMock('@/lib/auth/accountAuth', () => ({ requireAccountUserId }));

  const route = await import('@/app/api/route-intelligence/candidates/route');
  return { ...route, requireAccountUserId };
}

function request(body: unknown): NextRequest {
  return new NextRequest('https://halo.test/api/route-intelligence/candidates', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
