import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createProject } from '../packages/edm/src/index.mjs';
import { postgresStore } from '../backend/api/postgres.mjs';
import { createPostgresBackup, restorePostgresBackup, validatePostgresBackup, writePostgresBackup } from '../backend/api/postgres-backup.mjs';

const connectionString = process.env.EE_TEST_DATABASE_URL;

test('PostgreSQL store persists revisions and atomically rejects stale concurrent writes', {
  skip: !connectionString && 'Set EE_TEST_DATABASE_URL to run PostgreSQL integration coverage'
}, async () => {
  const pool = new Pool({ connectionString, max: 4 });
  let project;
  try {
    const migration = await readFile(new URL('../infrastructure/migrations/001_projects.sql', import.meta.url), 'utf8');
    await pool.query(migration);
    const store = postgresStore(pool);
    project = createProject('PostgreSQL integration');

    const created = await store.save(project, 0);
    assert.equal(created.revision, 1);
    assert.equal((await store.get(project.id)).project.name, project.name);
    assert.ok((await store.list()).some(item => item.id === project.id && item.revision === 1));

    const updatedProject = { ...created.project, name: 'PostgreSQL revision two' };
    const updated = await store.save(updatedProject, created.revision);
    assert.equal(updated.revision, 2);
    await assert.rejects(store.save(created.project, created.revision), /Revision conflict/);

    const contenders = await Promise.allSettled([
      store.save({ ...updated.project, name: 'Concurrent winner A' }, updated.revision),
      store.save({ ...updated.project, name: 'Concurrent winner B' }, updated.revision)
    ]);
    assert.equal(contenders.filter(result => result.status === 'fulfilled').length, 1);
    const rejected = contenders.find(result => result.status === 'rejected');
    assert.match(rejected.reason.message, /Revision conflict/);

    const finalRecord = await store.get(project.id);
    assert.equal(finalRecord.revision, 3);
    assert.match(finalRecord.project.name, /^Concurrent winner [AB]$/);
  } finally {
    if (project) await pool.query('DELETE FROM projects WHERE id = $1', [project.id]).catch(() => {});
    await pool.end();
  }
});

test('PostgreSQL backup restores into an empty database and rejects corruption or overwrite', {
  skip: !connectionString && 'Set EE_TEST_DATABASE_URL to run PostgreSQL backup coverage'
}, async () => {
  const adminPool = new Pool({ connectionString, max: 2 });
  const databaseName = `ee_backup_${randomUUID().replaceAll('-', '')}`;
  const destinationUrl = new URL(connectionString);
  destinationUrl.pathname = `/${databaseName}`;
  const backupDir = await mkdtemp(join(tmpdir(), 'e-electric-pg-backup-'));
  let destinationPool;
  let fixture;
  try {
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    destinationPool = new Pool({ connectionString: destinationUrl.toString(), max: 2 });
    const migration = await readFile(new URL('../infrastructure/migrations/001_projects.sql', import.meta.url), 'utf8');
    await destinationPool.query(migration);

    fixture = createProject('PostgreSQL backup fixture');
    const sourceStore = postgresStore(adminPool);
    await sourceStore.save(fixture, 0);
    const backup = await createPostgresBackup(adminPool);
    const validated = validatePostgresBackup(backup);
    assert.ok(validated.projects.some(record => record.id === fixture.id));

    const filePath = join(backupDir, 'snapshot.json');
    await writePostgresBackup(adminPool, filePath);
    assert.ok(validatePostgresBackup(JSON.parse(await readFile(filePath, 'utf8'))).projects.length > 0);
    await assert.rejects(writePostgresBackup(adminPool, filePath), { code: 'EEXIST' });

    const cliBackupPath = join(backupDir, 'cli-snapshot.json');
    const cliPath = fileURLToPath(new URL('../backend/api/postgres-backup.mjs', import.meta.url));
    const cliEnv = { ...process.env, DATABASE_URL: connectionString };
    const backupResult = spawnSync(process.execPath, [cliPath, 'backup', cliBackupPath], { encoding: 'utf8', env: cliEnv });
    assert.equal(backupResult.status, 0, backupResult.stderr);
    const cliBackup = validatePostgresBackup(JSON.parse(await readFile(cliBackupPath, 'utf8')));
    assert.ok(cliBackup.projects.some(record => record.id === fixture.id));

    const restoreResult = spawnSync(process.execPath, [cliPath, 'restore', cliBackupPath], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: destinationUrl.toString() }
    });
    assert.equal(restoreResult.status, 0, restoreResult.stderr);
    const destinationStore = postgresStore(destinationPool);
    const restored = await destinationStore.get(fixture.id);
    assert.equal(restored.project.name, fixture.name);
    assert.equal(restored.revision, 1);
    await assert.rejects(restorePostgresBackup(destinationPool, backup), /target must be empty/);
    assert.deepEqual(await destinationStore.get(fixture.id), restored);

    const corrupted = structuredClone(backup);
    corrupted.projects[0].payload.name += ' (changed)';
    assert.throws(() => validatePostgresBackup(corrupted), /checksum mismatch/);
  } finally {
    await destinationPool?.end();
    if (fixture) await adminPool.query('DELETE FROM projects WHERE id = $1', [fixture.id]).catch(() => {});
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`).catch(() => {});
    await adminPool.end();
    await rm(backupDir, { recursive: true, force: true });
  }
});
