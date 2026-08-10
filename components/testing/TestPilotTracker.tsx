'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics/react';
import {
  createTestPilotSessionId,
  TEST_PILOT_SESSION_STORAGE_KEY,
  TEST_PILOT_STARTED_STORAGE_KEY,
} from '@/lib/testing/testPilotAccess';

interface TestPilotTrackerProps {
  source: string;
  pilotCode: string;
}

export default function TestPilotTracker({
  source,
  pilotCode,
}: TestPilotTrackerProps) {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const eventProperties = {
      source,
      pilotCode,
      sessionId,
    };

    if (!hasStartedSession()) {
      markStartedSession();
      track('test_pilot_started', eventProperties);
    }

    track('test_pilot_opened', eventProperties);
  }, [pilotCode, source]);

  return null;
}

function getOrCreateSessionId(): string {
  try {
    const existingSessionId = window.localStorage.getItem(TEST_PILOT_SESSION_STORAGE_KEY);
    if (existingSessionId) return existingSessionId;

    const nextSessionId = createTestPilotSessionId();
    window.localStorage.setItem(TEST_PILOT_SESSION_STORAGE_KEY, nextSessionId);
    return nextSessionId;
  } catch {
    return createTestPilotSessionId();
  }
}

function hasStartedSession(): boolean {
  try {
    return window.localStorage.getItem(TEST_PILOT_STARTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markStartedSession() {
  try {
    window.localStorage.setItem(TEST_PILOT_STARTED_STORAGE_KEY, '1');
  } catch {
    // Analytics should not block the planner when browser storage is unavailable.
  }
}
