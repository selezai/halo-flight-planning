import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';

type HaloDatabase = NeonHttpDatabase<typeof schema>;
type NeonSql = ReturnType<typeof neon>;

let cachedDb: HaloDatabase | null = null;
let cachedSql: NeonSql | null = null;
let cachedUrl: string | null = null;

export function getDatabaseUrl(): string | undefined {
  return normalizeDatabaseUrl(process.env.DATABASE_URL) || normalizeDatabaseUrl(process.env.POSTGRES_URL);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getDb(): HaloDatabase {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL or POSTGRES_URL.');
  }

  if (!cachedDb || cachedUrl !== databaseUrl) {
    cachedSql = neon(databaseUrl);
    cachedDb = drizzle(cachedSql, { schema });
    cachedUrl = databaseUrl;
  }

  return cachedDb;
}

export function getSql(): NeonSql {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL or POSTGRES_URL.');
  }

  if (!cachedSql || cachedUrl !== databaseUrl) {
    cachedSql = neon(databaseUrl);
    cachedDb = drizzle(cachedSql, { schema });
    cachedUrl = databaseUrl;
  }

  return cachedSql;
}

function normalizeDatabaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return undefined;
  return trimmed;
}
