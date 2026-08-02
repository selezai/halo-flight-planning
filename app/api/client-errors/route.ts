import { NextResponse } from 'next/server';
import {
  buildSafeClientErrorLog,
  parseClientErrorPayload,
} from '@/lib/observability/clientErrors';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

export const POST = withApiLogging('/api/client-errors', async (request: Request) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const parsed = parseClientErrorPayload(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'Client error report is invalid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  console.error(JSON.stringify(buildSafeClientErrorLog(parsed.payload)));

  return NextResponse.json(
    { ok: true },
    { status: 202, headers: { 'Cache-Control': 'no-store' } }
  );
});
