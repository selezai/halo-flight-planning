export const TEST_PILOT_ACTIVITY_ENDPOINT = '/api/testing/test-pilot-events';

export const TEST_PILOT_EVENT_NAMES = [
  'test_pilot_started',
  'test_pilot_opened',
] as const;

export type TestPilotEventName = (typeof TEST_PILOT_EVENT_NAMES)[number];

export interface TestPilotEventProperties {
  source: string;
  pilotCode: string;
  sessionId: string;
}
