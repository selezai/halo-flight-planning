import { z } from 'zod';
import { getDb, getSql, isDatabaseConfigured } from '@/lib/db/client';
import { haloTestPilotEvents } from '@/lib/db/schema';
import { TEST_PILOT_EVENT_NAMES } from '@/lib/testing/testPilotEventTypes';

const SAFE_TRACKING_VALUE_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/i;
const MAX_TRACKING_VALUE_LENGTH = 80;
const MAX_SESSION_ID_LENGTH = 120;
const MAX_REQUEST_METADATA_LENGTH = 500;

export const testPilotEventInputSchema = z.object({
  eventName: z.enum(TEST_PILOT_EVENT_NAMES),
  source: z.string().trim().min(1).max(MAX_TRACKING_VALUE_LENGTH).regex(SAFE_TRACKING_VALUE_PATTERN),
  pilotCode: z.string().trim().min(1).max(MAX_TRACKING_VALUE_LENGTH).regex(SAFE_TRACKING_VALUE_PATTERN).optional(),
  sessionId: z.string().trim().min(8).max(MAX_SESSION_ID_LENGTH).regex(SAFE_TRACKING_VALUE_PATTERN),
}).strict();

export type TestPilotEventInput = z.infer<typeof testPilotEventInputSchema>;

export interface TestPilotEventRecord extends TestPilotEventInput {
  referrer?: string | null;
  userAgent?: string | null;
}

export { isDatabaseConfigured as isTestPilotEventsDatabaseConfigured };

export async function recordTestPilotEvent(event: TestPilotEventRecord): Promise<void> {
  await ensureTestPilotEventsSchema();

  await getDb()
    .insert(haloTestPilotEvents)
    .values({
      eventName: event.eventName,
      source: event.source,
      pilotCode: event.pilotCode ?? null,
      sessionId: event.sessionId,
      referrer: normalizeRequestMetadata(event.referrer),
      userAgent: normalizeRequestMetadata(event.userAgent),
    });
}

export async function ensureTestPilotEventsSchema(): Promise<void> {
  const sql = getSql();

  await sql.query(`
    create table if not exists halo_test_pilot_events (
      id bigserial primary key,
      event_name text not null check (event_name in ('test_pilot_started', 'test_pilot_opened')),
      source text not null,
      pilot_code text,
      session_id text not null,
      referrer text,
      user_agent text,
      created_at timestamptz not null default now()
    )
  `);

  await sql.query(`
    create index if not exists halo_test_pilot_events_created_at_idx
      on halo_test_pilot_events (created_at desc)
  `);

  await sql.query(`
    create index if not exists halo_test_pilot_events_pilot_code_idx
      on halo_test_pilot_events (pilot_code)
      where pilot_code is not null
  `);

  await sql.query(`
    comment on table halo_test_pilot_events is
      'Anonymous first-party activity events for Halo test-pilot link usage.'
  `);
}

export function normalizeRequestMetadata(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, MAX_REQUEST_METADATA_LENGTH);
}
