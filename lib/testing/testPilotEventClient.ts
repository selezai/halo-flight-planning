'use client';

import {
  TEST_PILOT_ACTIVITY_ENDPOINT,
  type TestPilotEventName,
  type TestPilotEventProperties,
} from '@/lib/testing/testPilotEventTypes';

export function sendTestPilotActivityEvent(
  eventName: TestPilotEventName,
  eventProperties: TestPilotEventProperties
): void {
  try {
    void fetch(TEST_PILOT_ACTIVITY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        ...eventProperties,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Test-pilot tracking must never interrupt planner access.
  }
}
