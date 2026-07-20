import { afterEach, describe, expect, it } from 'vitest';
import { getDatabaseUrl, isDatabaseConfigured } from '@/lib/db/client';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalPostgresUrl = process.env.POSTGRES_URL;

describe('database client config', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('treats missing and empty pulled sensitive env values as unconfigured', () => {
    process.env.DATABASE_URL = '""';
    process.env.POSTGRES_URL = '';

    expect(getDatabaseUrl()).toBeUndefined();
    expect(isDatabaseConfigured()).toBe(false);
  });

  it('prefers DATABASE_URL and falls back to POSTGRES_URL', () => {
    process.env.DATABASE_URL = '';
    process.env.POSTGRES_URL = 'postgres://example';

    expect(getDatabaseUrl()).toBe('postgres://example');
    expect(isDatabaseConfigured()).toBe(true);

    process.env.DATABASE_URL = 'postgres://primary';

    expect(getDatabaseUrl()).toBe('postgres://primary');
  });
});

function restoreEnv() {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalPostgresUrl === undefined) {
    delete process.env.POSTGRES_URL;
  } else {
    process.env.POSTGRES_URL = originalPostgresUrl;
  }
}
