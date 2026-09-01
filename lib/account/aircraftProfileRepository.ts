import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  approveAircraftPerformanceProfile,
  applyProfileEdit,
  parseAircraftPerformanceProfile,
} from '@/lib/planning/aircraftPerformance';
import { getDb, getSql, isDatabaseConfigured } from '@/lib/db/client';
import { haloAircraftProfiles } from '@/lib/db/schema';
import type { AircraftPerformanceProfile, PerformanceTable } from '@/types/planning';

export { isDatabaseConfigured as isAircraftProfileDatabaseConfigured };

export async function listAircraftPerformanceProfiles(userId: string): Promise<AircraftPerformanceProfile[]> {
  try {
    const rows = await getDb()
      .select()
      .from(haloAircraftProfiles)
      .where(eq(haloAircraftProfiles.userId, userId));

    return rows
      .map((row) => parseStoredProfile(row.profile, row.userId, row.createdAt, row.updatedAt, row.approvedAt))
      .sort((left, right) => Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? ''));
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

export async function getAircraftPerformanceProfile(
  userId: string,
  id: string
): Promise<AircraftPerformanceProfile | null> {
  try {
    const [row] = await getDb()
      .select()
      .from(haloAircraftProfiles)
      .where(and(eq(haloAircraftProfiles.userId, userId), eq(haloAircraftProfiles.id, id)))
      .limit(1);

    if (!row) return null;
    return parseStoredProfile(row.profile, row.userId, row.createdAt, row.updatedAt, row.approvedAt);
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
}

export async function createAircraftPerformanceProfile(
  userId: string,
  profile: AircraftPerformanceProfile
): Promise<AircraftPerformanceProfile> {
  const now = new Date();
  const parsed = parseAircraftPerformanceProfile({
    ...profile,
    id: profile.id || `aircraft-profile-${randomUUID()}`,
    ownerId: userId,
    status: 'draft',
    approvedAt: undefined,
    createdAt: profile.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  });

  const [row] = await getDb()
    .insert(haloAircraftProfiles)
    .values({
      id: parsed.id,
      userId,
      status: parsed.status,
      registration: parsed.registration,
      aircraftType: parsed.aircraftType,
      profile: parsed,
      approvedAt: parsed.approvedAt ? new Date(parsed.approvedAt) : null,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : now,
      updatedAt: now,
    })
    .returning();

  return parseStoredProfile(row.profile, row.userId, row.createdAt, row.updatedAt, row.approvedAt);
}

export async function updateAircraftPerformanceProfile(
  userId: string,
  id: string,
  updates: Partial<AircraftPerformanceProfile>
): Promise<AircraftPerformanceProfile | null> {
  const existing = await getAircraftPerformanceProfile(userId, id);
  if (!existing) return null;

  const { status: _status, approvedAt: _approvedAt, ownerId: _ownerId, ...safeUpdates } = updates;
  const updated = applyProfileEdit(existing, {
    ...safeUpdates,
    id,
    ownerId: userId,
  });

  const [row] = await getDb()
    .update(haloAircraftProfiles)
    .set({
      status: updated.status,
      registration: updated.registration,
      aircraftType: updated.aircraftType,
      profile: updated,
      approvedAt: updated.approvedAt ? new Date(updated.approvedAt) : null,
      updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : new Date(),
    })
    .where(and(eq(haloAircraftProfiles.userId, userId), eq(haloAircraftProfiles.id, id)))
    .returning();

  if (!row) return null;
  return parseStoredProfile(row.profile, row.userId, row.createdAt, row.updatedAt, row.approvedAt);
}

export async function approveStoredAircraftPerformanceProfile(
  userId: string,
  id: string,
  notes?: string
): Promise<AircraftPerformanceProfile | null> {
  const existing = await getAircraftPerformanceProfile(userId, id);
  if (!existing) return null;

  const approved = approveAircraftPerformanceProfile(existing, notes);
  const [row] = await getDb()
    .update(haloAircraftProfiles)
    .set({
      status: approved.status,
      profile: approved,
      approvedAt: approved.approvedAt ? new Date(approved.approvedAt) : new Date(),
      updatedAt: approved.updatedAt ? new Date(approved.updatedAt) : new Date(),
    })
    .where(and(eq(haloAircraftProfiles.userId, userId), eq(haloAircraftProfiles.id, id)))
    .returning();

  if (!row) return null;
  return parseStoredProfile(row.profile, row.userId, row.createdAt, row.updatedAt, row.approvedAt);
}

export async function replaceStoredPerformanceTables(
  userId: string,
  id: string,
  tables: PerformanceTable[]
): Promise<AircraftPerformanceProfile | null> {
  return updateAircraftPerformanceProfile(userId, id, { tables });
}

export async function ensureAircraftProfileSchema(): Promise<void> {
  const sql = getSql();

  await sql.query(`
    create table if not exists halo_aircraft_profiles (
      id text primary key,
      user_id text not null,
      status text not null default 'draft',
      registration text not null,
      aircraft_type text not null,
      profile jsonb not null,
      approved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint halo_aircraft_profiles_status_check
        check (status in ('draft', 'approved', 'archived'))
    )
  `);

  await sql.query(`
    create index if not exists halo_aircraft_profiles_user_id_idx
      on halo_aircraft_profiles (user_id)
  `);

  await sql.query(`
    create index if not exists halo_aircraft_profiles_updated_at_idx
      on halo_aircraft_profiles (updated_at desc)
  `);

  await sql.query(`
    create index if not exists halo_aircraft_profiles_registration_idx
      on halo_aircraft_profiles (registration)
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

function parseStoredProfile(
  profile: AircraftPerformanceProfile,
  ownerId: string,
  createdAt: Date,
  updatedAt: Date,
  approvedAt: Date | null
): AircraftPerformanceProfile {
  return parseAircraftPerformanceProfile({
    ...profile,
    ownerId,
    createdAt: profile.createdAt ?? createdAt.toISOString(),
    updatedAt: profile.updatedAt ?? updatedAt.toISOString(),
    approvedAt: profile.approvedAt ?? approvedAt?.toISOString(),
  });
}
