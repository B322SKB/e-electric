import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createProject } from '../packages/edm/src/index.mjs';
import { postgresStore } from '../backend/api/postgres.mjs';

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
