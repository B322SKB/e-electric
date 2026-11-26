import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../packages/edm/src/index.mjs';
import { addDevice, addConnection, addPage, moveSymbol, snapToGrid } from '../packages/editor/src/index.mjs';

test('snap rounds both axes to the configured grid', () => {
  assert.deepEqual(snapToGrid({x: 23, y: 38}, 10), {x: 20, y: 40});
});
test('adds page and device with stable representation and terminals', () => {
  let p = createProject('Test');
  p = addPage(p, 'Control');
  p = addDevice(p, p.pages[0].id, {tag:'-K1',symbolKey:'coil',x:23,y:38});
  assert.equal(p.devices.length, 1);
  assert.deepEqual(p.pages[0].symbols[0].position, {x:20,y:40});
  assert.equal(p.devices[0].terminals.length, 2);
});
test('connection endpoints must exist', () => {
  let p = addPage(createProject('Test'),'Control');
  p = addDevice(p,p.pages[0].id,{tag:'-K1',symbolKey:'coil',x:0,y:0});
  assert.throws(() => addConnection(p,{deviceId:p.devices[0].id,terminalId:'wrong'},{deviceId:p.devices[0].id,terminalId:p.devices[0].terminals[0].id}),/endpoint/i);
});
test('moving symbol does not mutate previous project', () => {
  let p = addPage(createProject('Test'),'Control');
  p = addDevice(p,p.pages[0].id,{tag:'-K1',symbolKey:'coil',x:0,y:0});
  const moved = moveSymbol(p,p.pages[0].symbols[0].id,{x:46,y:54});
  assert.deepEqual(p.pages[0].symbols[0].position,{x:0,y:0});
  assert.deepEqual(moved.pages[0].symbols[0].position,{x:50,y:50});
});
test('valid connection is added and project remains valid', async () => {
  const {validateProject} = await import('../packages/edm/src/index.mjs');
  let p = addPage(createProject('Test'),'Control');
  p = addDevice(p,p.pages[0].id,{tag:'-K1',symbolKey:'coil',x:0,y:0});
  p = addDevice(p,p.pages[0].id,{tag:'-F1',symbolKey:'switch',x:100,y:0});
  p = addConnection(p,{deviceId:p.devices[0].id,terminalId:p.devices[0].terminals[1].id},{deviceId:p.devices[1].id,terminalId:p.devices[1].terminals[0].id});
  assert.deepEqual(validateProject(p),[]);
});
