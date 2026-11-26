# Engineering Data Model (EDM) v0.1

The **project** is the source of truth, not exported drawing geometry.

## Records

- `project`: `schemaVersion`, `id`, `name`, `pages`, `devices`, `connections`.
- `page`: `id`, `name`, `kind`, `symbols`.
- `symbol`: unique representation ID, referenced `deviceId`, `symbolKey`, 2D position.
- `device`: stable ID, `tag` (unique within project), optional `partRef`, terminal list.
- `terminal`: `id` and `name` unique within owning device.
- `connection`: `id` and two endpoints (`deviceId` + `terminalId`).

A connection references terminal identity, not two arbitrary pixels. Two different symbols may represent one device on separate pages.

## Validation implemented in M0

- Supported schema version, valid UUIDs and unique IDs.
- Nonempty project name, device tags, terminal names.
- Globally unique representation and connection IDs.
- Symbol device references exist.
- Endpoint device and terminal references exist.
- No self-loop between exactly the same endpoint.
- Connections cannot repeat the same undirected endpoint pair.

## Planned extensions

Units and typed electrical properties, cross references, cable cores, terminal strips, hierarchy and IEC/EN structure identifiers, library version locks, 3D placements, immutable project revisions and audited changes.

## Compatibility contract

EPLAN, DWG, DXF and other external formats map through separate adapters. Preserve source identifiers and report every unsupported property. Never advertise a successful semantic import based solely on visual rendering.
