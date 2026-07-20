import { eq } from 'drizzle-orm';
import {
  parsePlannerSnapshotPayload,
  type PlannerSnapshotPayload,
  type StoredPlannerSnapshot,
} from '@/lib/account/plannerSnapshot';
import { getDb, isDatabaseConfigured } from '@/lib/db/client';
import { plannerSnapshots } from '@/lib/db/schema';

export { isDatabaseConfigured as isAccountDatabaseConfigured };

export async function getAccountPlannerSnapshot(userId: string): Promise<StoredPlannerSnapshot | null> {
  const [row] = await getDb()
    .select()
    .from(plannerSnapshots)
    .where(eq(plannerSnapshots.userId, userId))
    .limit(1);

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
