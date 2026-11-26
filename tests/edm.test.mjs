import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProject, validateProject } from '../packages/edm/src/index.mjs';

function fixture() {
  const project = createProject('Pump control');
  const a = { id: randomUUID(), tag: '-K1', terminals: [{ id: randomUUID(), name: 'A1' }] };
  const b = { id: randomUUID(), tag: '-F1', terminals: [{ id: randomUUID(), name: '2' }] };
  project.devices.push(a, b);
  project.pages.push({ id: randomUUID(), name: 'Control', kind: 'schematic', symbols: [
    { id: randomUUID(), deviceId: a.id, symbolKey: 'coil', position: { x: 10, y: 20 } }
  ]});
  project.connections.push({ id: randomUUID(), from: { deviceId: a.id, terminalId: a.terminals[0].id }, to: { deviceId: b.id, terminalId: b.terminals[0].id } });
  return project;
}

test('creates project with schema and stable UUID', () => {
  const project = createProject('  Pumps ');
  assert.equal(project.name, 'Pumps');
  assert.match(project.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(validateProject(project), []);
});

test('rejects blank project name', () => {
  assert.throws(() => createProject('  '), /name/i);
});

test('valid electrical connection graph is accepted', () => {
  assert.deepEqual(validateProject(fixture()), []);
});

test('rejects dangling terminal references', () => {
  const project = fixture();
  project.connections[0].to.terminalId = randomUUID();
  assert.match(validateProject(project).join(' '), /Invalid connection.to endpoint/);
});

test('rejects duplicate device tags', () => {
  const project = fixture();
  project.devices[1].tag = '-K1';
  assert.match(validateProject(project).join(' '), /Duplicate device tag/);
});

test('rejects repeated undirected connections', () => {
  const project = fixture();
  const first = project.connections[0];
  project.connections.push({ id: randomUUID(), from: first.to, to: first.from });
  assert.match(validateProject(project).join(' '), /Duplicate undirected connection/);
});

test('rejects references to unknown device', () => {
  const project = fixture();
  project.pages[0].symbols[0].deviceId = randomUUID();
  assert.match(validateProject(project).join(' '), /Unknown symbol device/);
});

test('rejects duplicate IDs', () => {
  const project = fixture();
  project.pages[0].symbols[0].id = project.devices[0].id;
  assert.match(validateProject(project).join(' '), /Duplicate entity ID/);
});

test('rejects malformed project', () => {
  assert.deepEqual(validateProject(null), ['Project must be an object']);
});
