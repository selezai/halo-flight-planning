export const TEST_PILOT_QUERY_PARAM = 'testPilot';
export const TEST_PILOT_SOURCE_QUERY_PARAM = 'source';
export const TEST_PILOT_CODE_QUERY_PARAM = 'pilot';
export const TEST_PILOT_SESSION_STORAGE_KEY = 'halo-test-pilot-session';
export const TEST_PILOT_STARTED_STORAGE_KEY = 'halo-test-pilot-started';
export const TEST_PILOT_CONTINUE_HREF = '/?testPilot=1&source=access-gate';

export type TestPilotSearchParams = Record<string, string | string[] | undefined>;

export interface TestPilotLinkContext {
  enabled: boolean;
  source: string;
  pilotCode: string;
}

const DEFAULT_TEST_PILOT_SOURCE = 'direct';
const UNKNOWN_TEST_PILOT_CODE = 'unknown';
const MAX_TRACKING_VALUE_LENGTH = 80;
const SAFE_TRACKING_VALUE_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/i;

export function resolveTestPilotLinkContext(
  searchParams: TestPilotSearchParams
): TestPilotLinkContext {
  const enabled = getSingleSearchParam(searchParams[TEST_PILOT_QUERY_PARAM]) === '1';

  return {
    enabled,
    source: sanitizeTrackingValue(
      getSingleSearchParam(searchParams[TEST_PILOT_SOURCE_QUERY_PARAM]),
      DEFAULT_TEST_PILOT_SOURCE
    ),
    pilotCode: sanitizeTrackingValue(
      getSingleSearchParam(searchParams[TEST_PILOT_CODE_QUERY_PARAM]),
      UNKNOWN_TEST_PILOT_CODE
    ),
  };
}

export function createTestPilotSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function sanitizeTrackingValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const clipped = trimmed.slice(0, MAX_TRACKING_VALUE_LENGTH);
  return SAFE_TRACKING_VALUE_PATTERN.test(clipped) ? clipped : fallback;
}
