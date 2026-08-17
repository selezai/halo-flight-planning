import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('test pilot events API route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns a setup error when Neon is not configured', async () => {
    const { POST, recordTestPilotEvent } = await loadRouteWithMocks({
      databaseConfigured: false,
    });

    const response = await POST(new NextRequest('https://halo.test/api/testing/test-pilot-events', {
      method: 'POST',
      body: JSON.stringify(validEventPayload()),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({ error: 'Test pilot activity database is not configured.' });
    expect(recordTestPilotEvent).not.toHaveBeenCalled();
  });

  it('requires valid JSON', async () => {
    const { POST, recordTestPilotEvent } = await loadRouteWithMocks({
      databaseConfigured: true,
    });

    const response = await POST(new NextRequest('https://halo.test/api/testing/test-pilot-events', {
      method: 'POST',
      body: '{',
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Request body must be valid JSON.' });
    expect(recordTestPilotEvent).not.toHaveBeenCalled();
  });

  it('rejects invalid payloads before writing', async () => {
    const { POST, recordTestPilotEvent } = await loadRouteWithMocks({
      databaseConfigured: true,
    });

    const response = await POST(new NextRequest('https://halo.test/api/testing/test-pilot-events', {
      method: 'POST',
      body: JSON.stringify({
        eventName: 'test_pilot_opened',
        source: 'pilot@example.com',
        pilotCode: 'p01',
        sessionId: 'test-session-123',
      }),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Invalid test-pilot event payload.' });
    expect(recordTestPilotEvent).not.toHaveBeenCalled();
  });

  it('records valid events with server-side request metadata', async () => {
    const { POST, recordTestPilotEvent } = await loadRouteWithMocks({
      databaseConfigured: true,
    });

    const response = await POST(new NextRequest('https://halo.test/api/testing/test-pilot-events', {
      method: 'POST',
      body: JSON.stringify(validEventPayload()),
      headers: {
        referer: 'https://halo-flight-planning.vercel.app/?testPilot=1',
        'user-agent': 'Halo Test Browser',
      },
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(recordTestPilotEvent).toHaveBeenCalledWith({
      ...validEventPayload(),
      referrer: 'https://halo-flight-planning.vercel.app/?testPilot=1',
      userAgent: 'Halo Test Browser',
    });
  });

  it('returns a service error when event storage fails', async () => {
    const { POST } = await loadRouteWithMocks({
      databaseConfigured: true,
      recordError: new Error('database unavailable'),
    });

    const response = await POST(new NextRequest('https://halo.test/api/testing/test-pilot-events', {
      method: 'POST',
      body: JSON.stringify(validEventPayload()),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({ error: 'Test pilot activity tracking is unavailable.' });
  });
});

function validEventPayload() {
  return {
    eventName: 'test_pilot_opened',
    source: 'whatsapp-group',
    pilotCode: 'p01',
    sessionId: 'test-session-123',
  } as const;
}

async function loadRouteWithMocks({
  databaseConfigured,
  recordError,
}: {
  databaseConfigured: boolean;
  recordError?: Error;
}) {
  vi.resetModules();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const recordTestPilotEvent = vi.fn().mockImplementation(async () => {
    if (recordError) throw recordError;
  });
  const isTestPilotEventsDatabaseConfigured = vi.fn().mockReturnValue(databaseConfigured);

  vi.doMock('@/lib/testing/testPilotEvents', async () => {
    const actual = await vi.importActual<typeof import('@/lib/testing/testPilotEvents')>(
      '@/lib/testing/testPilotEvents'
    );

    return {
      ...actual,
      isTestPilotEventsDatabaseConfigured,
      recordTestPilotEvent,
    };
  });

  const route = await import('@/app/api/testing/test-pilot-events/route');

  return {
    ...route,
    isTestPilotEventsDatabaseConfigured,
    recordTestPilotEvent,
  };
}
