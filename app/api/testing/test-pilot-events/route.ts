import { NextRequest, NextResponse } from 'next/server';
import {
  isTestPilotEventsDatabaseConfigured,
  recordTestPilotEvent,
  testPilotEventInputSchema,
} from '@/lib/testing/testPilotEvents';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

export const POST = withApiLogging('/api/testing/test-pilot-events', async (request: NextRequest) => {
  if (!isTestPilotEventsDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Test pilot activity database is not configured.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const parsed = testPilotEventInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid test-pilot event payload.' },
      { status: 400 }
    );
  }

  try {
    await recordTestPilotEvent({
      ...parsed.data,
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logTestPilotEventFailure(error);
    return NextResponse.json(
      { error: 'Test pilot activity tracking is unavailable.' },
      { status: 503 }
    );
  }
});

function logTestPilotEventFailure(error: unknown) {
  console.error(JSON.stringify({
    level: 'error',
    message: 'test_pilot_event_record_failed',
    error: error instanceof Error ? error.name : 'UnknownError',
    timestamp: new Date().toISOString(),
  }));
}
