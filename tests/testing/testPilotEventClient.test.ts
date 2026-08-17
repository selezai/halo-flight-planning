import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEST_PILOT_ACTIVITY_ENDPOINT } from '@/lib/testing/testPilotEventTypes';
import { sendTestPilotActivityEvent } from '@/lib/testing/testPilotEventClient';

describe('test pilot event client sender', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts anonymous test-pilot activity without waiting on the response', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    sendTestPilotActivityEvent('test_pilot_opened', {
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'test-session-123',
    });

    expect(fetchMock).toHaveBeenCalledWith(TEST_PILOT_ACTIVITY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'test_pilot_opened',
        source: 'whatsapp-group',
        pilotCode: 'p01',
        sessionId: 'test-session-123',
      }),
      keepalive: true,
    });
  });

  it('swallows synchronous fetch failures so planner access is not interrupted', () => {
    const fetchMock = vi.fn(() => {
      throw new Error('fetch blocked');
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(() => sendTestPilotActivityEvent('test_pilot_started', {
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'test-session-123',
    })).not.toThrow();
  });
});
