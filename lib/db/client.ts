import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';

type HaloDatabase = NeonHttpDatabase<typeof schema>;

let cachedDb: HaloDatabase | null = null;
let cachedUrl: string | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
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
    cachedDb = drizzle(neon(databaseUrl), { schema });
    cachedUrl = databaseUrl;
  }

  return cachedDb;
}
