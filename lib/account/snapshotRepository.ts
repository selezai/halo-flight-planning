import { eq } from 'drizzle-orm';
import {
  parsePlannerSnapshotPayload,
  type PlannerSnapshotPayload,
  type StoredPlannerSnapshot,
} from '@/lib/account/plannerSnapshot';
import { getDb, getSql, isDatabaseConfigured } from '@/lib/db/client';
import { plannerSnapshots } from '@/lib/db/schema';

export { isDatabaseConfigured as isAccountDatabaseConfigured };

export async function getAccountPlannerSnapshot(userId: string): Promise<StoredPlannerSnapshot | null> {
  let row;
  try {
    [row] = await getDb()
      .select()
      .from(plannerSnapshots)
      .where(eq(plannerSnapshots.userId, userId))
      .limit(1);
  } catch (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  if (!row) return null;

  return {
    userId: row.userId,
    snapshot: parsePlannerSnapshotPayload(row.snapshot),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertAccountPlannerSnapshot(
  userId: string,
  snapshot: PlannerSnapshotPayload
): Promise<StoredPlannerSnapshot> {
  const parsedSnapshot = parsePlannerSnapshotPayload(snapshot);
  const now = new Date();

  await ensureAccountSnapshotSchema();

  const [row] = await getDb()
    .insert(plannerSnapshots)
    .values({
      userId,
      snapshot: parsedSnapshot,
      version: parsedSnapshot.version,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: plannerSnapshots.userId,
      set: {
        snapshot: parsedSnapshot,
        version: parsedSnapshot.version,
        updatedAt: now,
      },
    })
    .returning();

  return {
    userId: row.userId,
    snapshot: parsePlannerSnapshotPayload(row.snapshot),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureAccountSnapshotSchema(): Promise<void> {
  const sql = getSql();

  await sql.query(`
    create table if not exists halo_planner_snapshots (
      user_id text primary key,
      snapshot jsonb not null,
      version integer not null default 1,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await sql.query(`
    create index if not exists halo_planner_snapshots_updated_at_idx
      on halo_planner_snapshots (updated_at desc)
  `);

  await sql.query(`
    comment on table halo_planner_snapshots is
      'Latest owner-scoped Halo planner snapshot for Clerk-authenticated account sync.'
  `);
}

export function isMissingRelationError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '42P01'
  );
}
