import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateProject } from '../../packages/edm/src/index.mjs';

export const POSTGRES_BACKUP_FORMAT = 'e-electric-postgres-backup';
export const POSTGRES_BACKUP_VERSION = 1;

const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
const validTimestamp = value => typeof value === 'string'
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

function digest(body) {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function backupBody(backup) {
  return {
    format: backup.format,
    version: backup.version,
    createdAt: backup.createdAt,
    projects: backup.projects.map(({ id, revision, updatedAt, payload }) => ({ id, revision, updatedAt, payload }))
  };
}

export function validatePostgresBackup(input) {
  if (!exactKeys(input, ['format', 'version', 'createdAt', 'projects', 'checksum'])
      || input.format !== POSTGRES_BACKUP_FORMAT
      || input.version !== POSTGRES_BACKUP_VERSION
      || !validTimestamp(input.createdAt)
      || !Array.isArray(input.projects)
      || typeof input.checksum !== 'string'
      || !/^[a-f0-9]{64}$/i.test(input.checksum)) {
    throw new Error('Invalid PostgreSQL backup manifest');
  }

  const ids = new Set();
  for (const record of input.projects) {
    if (!exactKeys(record, ['id', 'revision', 'updatedAt', 'payload'])
        || !Number.isSafeInteger(record.revision)
        || record.revision < 1
        || !validTimestamp(record.updatedAt)
        || record.payload?.id !== record.id
        || ids.has(record.id)
        || validateProject(record.payload).length) {
      throw new Error('Invalid project record in PostgreSQL backup');
    }
    ids.add(record.id);
  }

  const body = backupBody(input);
  const actual = Buffer.from(digest(body), 'hex');
  const supplied = Buffer.from(input.checksum, 'hex');
  if (!timingSafeEqual(actual, supplied)) throw new Error('PostgreSQL backup checksum mismatch');
  return { ...body, checksum: input.checksum.toLowerCase() };
}

export async function createPostgresBackup(pool) {
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    inTransaction = true;
    const result = await client.query('SELECT id::text AS id, revision, payload, updated_at FROM projects ORDER BY id');
    const body = {
      format: POSTGRES_BACKUP_FORMAT,
      version: POSTGRES_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      projects: result.rows.map(row => ({
        id: row.id,
        revision: Number(row.revision),
        updatedAt: row.updated_at.toISOString(),
        payload: row.payload
      }))
    };
    const backup = { ...body, checksum: digest(body) };
    validatePostgresBackup(backup);
    await client.query('COMMIT');
    inTransaction = false;
    return backup;
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function restorePostgresBackup(pool, input) {
  const backup = validatePostgresBackup(input);
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query('LOCK TABLE projects IN ACCESS EXCLUSIVE MODE');
    const existing = await client.query('SELECT 1 FROM projects LIMIT 1');
    if (existing.rowCount) throw new Error('PostgreSQL restore target must be empty');

    for (const record of backup.projects) {
      await client.query(
        'INSERT INTO projects(id,revision,payload,updated_at) VALUES($1,$2,$3::jsonb,$4)',
        [record.id, record.revision, JSON.stringify(record.payload), record.updatedAt]
      );
    }
    await client.query('COMMIT');
    inTransaction = false;
    return backup.projects.length;
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function writePostgresBackup(pool, destinationPath) {
  const destination = resolve(destinationPath);
  const backup = await createPostgresBackup(pool);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, `${JSON.stringify(backup, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    await link(temporary, destination);
    return destination;
  } finally {
    await rm(temporary, { force: true });
  }
}

async function runCli(args = process.argv.slice(2), env = process.env) {
  const [operation, backupPath, ...extra] = args;
  if (!['backup', 'restore'].includes(operation) || !backupPath || extra.length || !env.DATABASE_URL) {
    throw new Error('Usage: DATABASE_URL=... node backend/api/postgres-backup.mjs <backup|restore> <file>');
  }

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  try {
    await pool.query('SELECT 1 FROM projects LIMIT 0');
    if (operation === 'backup') {
      const path = await writePostgresBackup(pool, backupPath);
      console.log(`Backup created: ${path}`);
      return;
    }
    const input = JSON.parse(await readFile(backupPath, 'utf8'));
    const count = await restorePostgresBackup(pool, input);
    console.log(`Restored ${count} project(s)`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch(error => {
    console.error(`PostgreSQL backup failed: ${error.message}`);
    process.exitCode = 1;
  });
}
