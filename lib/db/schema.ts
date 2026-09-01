import { bigserial, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { PlannerSnapshotPayload } from '@/lib/account/plannerSnapshot';
import type { TestPilotEventName } from '@/lib/testing/testPilotEventTypes';
import type { AircraftPerformanceProfile, AircraftPerformanceProfileStatus } from '@/types/planning';

export const plannerSnapshots = pgTable('halo_planner_snapshots', {
  userId: text('user_id').primaryKey(),
  snapshot: jsonb('snapshot').$type<PlannerSnapshotPayload>().notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const haloTestPilotEvents = pgTable(
  'halo_test_pilot_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    eventName: text('event_name').$type<TestPilotEventName>().notNull(),
    source: text('source').notNull(),
    pilotCode: text('pilot_code'),
    sessionId: text('session_id').notNull(),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('halo_test_pilot_events_created_at_idx').on(table.createdAt),
    pilotCodeIdx: index('halo_test_pilot_events_pilot_code_idx').on(table.pilotCode),
  })
);

export const haloAircraftProfiles = pgTable(
  'halo_aircraft_profiles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    status: text('status').$type<AircraftPerformanceProfileStatus>().notNull().default('draft'),
    registration: text('registration').notNull(),
    aircraftType: text('aircraft_type').notNull(),
    profile: jsonb('profile').$type<AircraftPerformanceProfile>().notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('halo_aircraft_profiles_user_id_idx').on(table.userId),
    updatedAtIdx: index('halo_aircraft_profiles_updated_at_idx').on(table.updatedAt),
    registrationIdx: index('halo_aircraft_profiles_registration_idx').on(table.registration),
  })
);
