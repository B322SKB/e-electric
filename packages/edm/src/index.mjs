import { randomUUID } from 'node:crypto';

export const SCHEMA_VERSION = '0.1.0';
const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function createProject(name) {
  if (!nonempty(name)) throw new TypeError('Project name is required');
  return {
    schemaVersion: SCHEMA_VERSION,
    id: randomUUID(),
    name: name.trim(),
    pages: [],
    devices: [],
    connections: []
  };
}

export function validateProject(project) {
  const errors = [];
  if (project === null || typeof project !== 'object' || Array.isArray(project)) return ['Project must be an object'];
  if (project.schemaVersion !== SCHEMA_VERSION) errors.push('Unsupported schemaVersion');
  if (!uuid(project.id)) errors.push('Invalid project.id');
  if (!nonempty(project.name)) errors.push('Project name is required');
  for (const key of ['pages', 'devices', 'connections']) {
    if (!Array.isArray(project[key])) errors.push(`${key} must be an array`);
  }
  if (errors.length) return errors;

  const seenIds = new Set([project.id]);
  const trackId = (id, label) => {
    if (!uuid(id)) errors.push(`Invalid ${label}`);
    if (seenIds.has(id)) errors.push(`Duplicate entity ID: ${id}`);
    seenIds.add(id);
  };
  const devices = new Map();
  const tags = new Set();

  for (const device of project.devices) {
    if (!device || typeof device !== 'object') { errors.push('Invalid device'); continue; }
    trackId(device.id, 'device.id');
    if (!nonempty(device.tag)) errors.push('Device tag is required');
    else if (tags.has(device.tag)) errors.push(`Duplicate device tag: ${device.tag}`);
    else tags.add(device.tag);
    if (devices.has(device.id)) errors.push(`Duplicate device ID: ${device.id}`);
    if (!Array.isArray(device.terminals)) { errors.push('Device terminals must be an array'); continue; }
    const terminalIds = new Set(), terminalNames = new Set();
    for (const terminal of device.terminals) {
      if (!terminal || typeof terminal !== 'object') { errors.push('Invalid terminal'); continue; }
      trackId(terminal.id, 'terminal.id');
      if (terminalIds.has(terminal.id)) errors.push(`Duplicate terminal ID: ${terminal.id}`);
      terminalIds.add(terminal.id);
      if (!nonempty(terminal.name)) errors.push('Terminal name is required');
      else if (terminalNames.has(terminal.name)) errors.push(`Duplicate terminal name: ${terminal.name}`);
      else terminalNames.add(terminal.name);
    }
    devices.set(device.id, terminalIds);
  }

  for (const page of project.pages) {
    if (!page || typeof page !== 'object') { errors.push('Invalid page'); continue; }
    trackId(page.id, 'page.id');
    if (!nonempty(page.name)) errors.push('Page name is required');
    if (!Array.isArray(page.symbols)) { errors.push('Page symbols must be an array'); continue; }
    for (const symbol of page.symbols) {
      if (!symbol || typeof symbol !== 'object') { errors.push('Invalid symbol'); continue; }
      trackId(symbol.id, 'symbol.id');
      if (!devices.has(symbol.deviceId)) errors.push(`Unknown symbol device: ${symbol.deviceId}`);
      if (!nonempty(symbol.symbolKey)) errors.push('Symbol key is required');
      if (!symbol.position || !Number.isFinite(symbol.position.x) || !Number.isFinite(symbol.position.y)) errors.push('Invalid symbol position');
    }
  }

  const pairs = new Set();
  const endpointKey = (endpoint) => {
    if (!endpoint || !devices.has(endpoint.deviceId) || !devices.get(endpoint.deviceId).has(endpoint.terminalId)) return null;
    return `${endpoint.deviceId}/${endpoint.terminalId}`;
  };
  for (const connection of project.connections) {
    if (!connection || typeof connection !== 'object') { errors.push('Invalid connection'); continue; }
    trackId(connection.id, 'connection.id');
    const from = endpointKey(connection.from), to = endpointKey(connection.to);
    if (!from) errors.push('Invalid connection.from endpoint');
    if (!to) errors.push('Invalid connection.to endpoint');
    if (from && to) {
      if (from === to) errors.push('Connection cannot connect endpoint to itself');
      const pair = [from, to].sort().join('::');
      if (pairs.has(pair)) errors.push('Duplicate undirected connection');
      pairs.add(pair);
    }
  }
  return errors;
}
