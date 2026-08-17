import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeRequestMetadata,
  testPilotEventInputSchema,
} from '@/lib/testing/testPilotEvents';

describe('test pilot event validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('accepts a known anonymous test-pilot event payload', () => {
    const result = testPilotEventInputSchema.safeParse({
      eventName: 'test_pilot_opened',
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'test-session-123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        eventName: 'test_pilot_opened',
        source: 'whatsapp-group',
        pilotCode: 'p01',
        sessionId: 'test-session-123',
      });
    }
  });

  it('rejects unknown events and unsafe tracking values', () => {
    expect(testPilotEventInputSchema.safeParse({
      eventName: 'clicked_secret_button',
      source: 'whatsapp-group',
      pilotCode: 'p01',
      sessionId: 'test-session-123',
    }).success).toBe(false);

    expect(testPilotEventInputSchema.safeParse({
      eventName: 'test_pilot_opened',
      source: 'pilot@example.com',
      pilotCode: 'p01',
      sessionId: 'test-session-123',
    }).success).toBe(false);

    expect(testPilotEventInputSchema.safeParse({
      eventName: 'test_pilot_opened',
      source: 'whatsapp-group',
      pilotCode: 'John Smith',
      sessionId: 'short',
    }).success).toBe(false);
  });

  it('normalizes request metadata before storage', () => {
    expect(normalizeRequestMetadata(undefined)).toBeNull();
    expect(normalizeRequestMetadata('   ')).toBeNull();
    expect(normalizeRequestMetadata('  https://example.com/test  ')).toBe('https://example.com/test');
    expect(normalizeRequestMetadata('x'.repeat(550))).toHaveLength(500);
  });

  it('creates the schema and inserts the sanitized event row', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });

    vi.doMock('@/lib/db/client', () => ({
      getSql: vi.fn(() => ({ query })),
      getDb: vi.fn(() => ({ insert })),
      isDatabaseConfigured: vi.fn(() => true),
    }));

    const { recordTestPilotEvent } = await import('@/lib/testing/testPilotEvents');

    await recordTestPilotEvent({
      eventName: 'test_pilot_started',
      source: 'whatsapp-dm',
      pilotCode: undefined,
      sessionId: 'test-session-123',
      referrer: ' https://halo.test/start ',
      userAgent: 'Halo Test Browser',
    });

    expect(query).toHaveBeenCalledTimes(4);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      eventName: 'test_pilot_started',
      source: 'whatsapp-dm',
      pilotCode: null,
      sessionId: 'test-session-123',
      referrer: 'https://halo.test/start',
      userAgent: 'Halo Test Browser',
    });
  });
});
