import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

loadEnvFile(resolve(projectRoot, '.env.local'));
loadEnvFile(resolve(projectRoot, '.env'));

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL or POSTGRES_URL. Finish Neon setup and run `vercel env pull .env.local --yes` first.');
  process.exit(1);
}

const migrationPath = resolve(projectRoot, 'db/migrations/0001_halo_account_snapshots.sql');
const migrationSql = readFileSync(migrationPath, 'utf8');
const statements = splitSqlStatements(migrationSql);
const sql = neon(databaseUrl);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Applied ${statements.length} account sync migration statement(s).`);

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const file = readFileSync(path, 'utf8');
  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = stripOptionalQuotes(value);
  }
}

function stripOptionalQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function splitSqlStatements(sqlText) {
  return sqlText
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}
