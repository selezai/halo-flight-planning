import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { PlannerSnapshotPayload } from '@/lib/account/plannerSnapshot';

export const plannerSnapshots = pgTable('halo_planner_snapshots', {
  userId: text('user_id').primaryKey(),
  snapshot: jsonb('snapshot').$type<PlannerSnapshotPayload>().notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
