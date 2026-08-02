import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildSafeClientErrorLog,
  parseClientErrorPayload,
  sanitizeClientLogText,
} from '@/lib/observability/clientErrors';

describe('client error observability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('validates required client error payload fields', () => {
    expect(parseClientErrorPayload({
      source: 'app-error-boundary',
      errorMessage: 'Map failed',
    })).toMatchObject({ ok: true });

    expect(parseClientErrorPayload({
      source: 'unknown',
      errorMessage: 'Map failed',
    })).toEqual({ ok: false });
  });

  it('redacts common secret tokens before logging', () => {
    const sanitized = sanitizeClientLogText(
      'failed with api_key=abc123 token=def456 Authorization=ghi789 Bearer jwt.secret.value'
    );

    expect(sanitized).toContain('api_key=[redacted]');
    expect(sanitized).toContain('token=[redacted]');
    expect(sanitized).toContain('Authorization=[redacted]');
    expect(sanitized).toContain('Bearer [redacted]');
    expect(sanitized).not.toContain('abc123');
    expect(sanitized).not.toContain('def456');
    expect(sanitized).not.toContain('ghi789');
    expect(sanitized).not.toContain('jwt.secret.value');
  });

  it('removes query strings from logged paths', () => {
    const log = buildSafeClientErrorLog({
      source: 'global-error-boundary',
      errorMessage: 'Boot failed',
      path: '/?token=secret#map',
    });

    expect(log.path).toBe('/');
    expect(JSON.stringify(log)).not.toContain('secret');
  });

  it('accepts valid reports through the API without exposing raw secret values', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { POST } = await import('@/app/api/client-errors/route');
    const response = await POST(new Request('https://halo.test/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        source: 'app-error-boundary',
        buildId: 'build-123',
        errorName: 'Error',
        errorMessage: 'Map failed with token=secret-token',
        path: '/?api_key=secret',
        userAgent: 'iPhone Chrome',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }), {});

    expect(response.status).toBe(202);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    const logged = JSON.parse(String(errorSpy.mock.calls[0][0]));
    expect(logged).toMatchObject({
      level: 'error',
      message: 'client_error_reported',
      source: 'app-error-boundary',
      buildId: 'build-123',
      errorName: 'Error',
      path: '/',
      userAgent: 'iPhone Chrome',
    });
    expect(JSON.stringify(logged)).not.toContain('secret-token');
    expect(JSON.stringify(logged)).not.toContain('api_key=secret');
  });

  it('rejects invalid client error API payloads', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { POST } = await import('@/app/api/client-errors/route');
    const response = await POST(new Request('https://halo.test/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({ source: 'unknown' }),
      headers: {
        'Content-Type': 'application/json',
      },
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Client error report is invalid.' });
  });
});
