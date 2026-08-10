import { describe, expect, it } from 'vitest';
import {
  resolveTestPilotLinkContext,
  TEST_PILOT_CONTINUE_HREF,
} from '@/lib/testing/testPilotAccess';

describe('test pilot access links', () => {
  it('enables local test pilot mode from a coded link', () => {
    expect(
      resolveTestPilotLinkContext({
        testPilot: '1',
        source: 'whatsapp-dm',
        pilot: 'p01',
      })
    ).toEqual({
      enabled: true,
      source: 'whatsapp-dm',
      pilotCode: 'p01',
    });
  });

  it('keeps normal unsigned visitors on the account gate', () => {
    expect(resolveTestPilotLinkContext({}).enabled).toBe(false);
    expect(resolveTestPilotLinkContext({ testPilot: '0' }).enabled).toBe(false);
  });

  it('falls back instead of accepting unsafe tracking values', () => {
    expect(
      resolveTestPilotLinkContext({
        testPilot: '1',
        source: 'pilot@example.com',
        pilot: 'John Smith',
      })
    ).toEqual({
      enabled: true,
      source: 'direct',
      pilotCode: 'unknown',
    });
  });

  it('uses a gate link that preserves the test pilot query flag', () => {
    expect(TEST_PILOT_CONTINUE_HREF).toBe('/?testPilot=1&source=access-gate');
  });
});
