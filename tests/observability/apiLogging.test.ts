import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { logApiEvent, withApiLogging } from '@/lib/observability/api';

describe('API observability logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes structured API event logs without secrets', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logApiEvent({
      level: 'info',
      message: 'api_request_complete',
      route: '/api/example',
      method: 'GET',
      status: 200,
      durationMs: 12,
      requestId: 'iad1::abc',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload).toMatchObject({
      level: 'info',
      message: 'api_request_complete',
      route: '/api/example',
      method: 'GET',
      status: 200,
      durationMs: 12,
      requestId: 'iad1::abc',
    });
    expect(JSON.stringify(payload)).not.toContain('OPENAIP_API_KEY');
  });

  it('wraps handlers with start and complete logs', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = withApiLogging('/api/test', async () =>
      NextResponse.json({ ok: true }, { status: 201 })
    );
    const request = new Request('https://halo.test/api/test', {
      headers: {
        'x-vercel-id': 'iad1::request',
      },
    });

    const response = await handler(request, {});

    expect(response.status).toBe(201);
    expect(spy).toHaveBeenCalledTimes(2);
    const complete = JSON.parse(String(spy.mock.calls[1][0]));
    expect(complete).toMatchObject({
      level: 'info',
      message: 'api_request_complete',
      route: '/api/test',
      method: 'GET',
      status: 201,
      requestId: 'iad1::request',
    });
  });

  it('logs thrown handler failures and returns a safe generic response', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = withApiLogging('/api/fail', async () => {
      throw new Error('provider secret failure detail');
    });

    const response = await handler(new Request('https://halo.test/api/fail'), {});
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: 'Internal server error' });
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(String(spy.mock.calls[0][0]));
    expect(logged).toMatchObject({
      level: 'error',
      message: 'api_request_failed',
      route: '/api/fail',
      status: 500,
      error: 'Error',
    });
    expect(JSON.stringify(logged)).not.toContain('provider secret failure detail');
  });
});
