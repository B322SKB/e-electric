import {randomUUID} from 'node:crypto';
import {validateProject} from '../../edm/src/index.mjs';

const copy = p => structuredClone(p);
function checked(p) {
  const errors = validateProject(p);
  if (errors.length) throw new Error(errors.join('; '));
  return p;
}
export function snapToGrid(pos, size=10) {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(size) || size<=0) throw new TypeError('Invalid position or grid');
  return {x: Math.round(pos.x/size)*size,y:Math.round(pos.y/size)*size};
}
export function addPage(project,name) {
  const p=copy(project);
  if (!name?.trim()) throw new Error('Page name required');
  p.pages.push({id:randomUUID(),name:name.trim(),kind:'schematic',symbols:[]});
  return checked(p);
}
export function addDevice(project,pageId,{tag,symbolKey,x,y}) {
  const p=copy(project);
  const page=p.pages.find(page=>page.id===pageId);
  if (!page) throw new Error('Page not found');
  if (!tag?.trim() || !symbolKey?.trim()) throw new Error('Tag and symbol key required');
  const id=randomUUID();
  const terminals=['1','2'].map(name=>({id:randomUUID(),name}));
  p.devices.push({id,tag:tag.trim(),terminals});
  page.symbols.push({id:randomUUID(),deviceId:id,symbolKey,position:snapToGrid({x,y})});
  return checked(p);
}
export function moveSymbol(project,symbolId,position) {
  const p=copy(project);
  const symbol=p.pages.flatMap(page=>page.symbols).find(s=>s.id===symbolId);
  if (!symbol) throw new Error('Symbol not found');
  symbol.position=snapToGrid(position);
  return checked(p);
}
export function addConnection(project,from,to) {
  const p=copy(project);
  p.connections.push({id:randomUUID(),from,to});
  try { return checked(p); } catch(e) { throw new Error('Invalid connection endpoint or duplicate: '+e.message); }
}
