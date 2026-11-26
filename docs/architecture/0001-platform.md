# Architecture decision 0001 — hybrid CAD/CAE foundation

Status: Proposed baseline, 2026-11-26.

## Goal

An independently built CAD/CAE alternative with an Engineering Data Model as the source of truth. The initial target is a demonstrable electrical schematic workflow; fluid, PLC, cabinet 3D and harness modules follow in phases.

## Constraints

- Initial deployment: 2–10 engineers; Windows desktops and browser clients.
- Desktop must allow editing while disconnected. Local SQLite is proposed for local state, PostgreSQL for shared server state.
- Offline sync shall be object/revision based, with deterministic conflict detection and **no silent overwrite**.
- Docker containers run server-side services. A Windows desktop application is distributed separately.
- Imports and exports shall declare supported format/version/coverage; PDF and DXF do not automatically imply semantic electrical connectivity.
- Native EPLAN project compatibility is **not claimed**. Any EPLAN-specific import/export must use documented mechanisms with appropriate licenses and sample projects for verification.

## Component boundaries

1. `packages/edm`: pure domain records, invariants, identifier references and format versions.
2. `packages/cad-2d` (future): viewports, symbols, snap, geometry and connection rendering.
3. `apps/web` (future): project manager, editor and reporting.
4. `apps/desktop` (future): Tauri shell, offline database and sync adapter.
5. `backend/api` (future): identity, project access, revisions, library catalog.
6. `backend/workers` (future): exports, validation and generation.
7. `infrastructure`: local development server stack.

Do not access database tables directly from UI. The graphical symbol instance references the technical function/device; it is not another device.

## Initial model

Project -> pages -> symbol representations. Devices have function tags, terminals and component references. Connections reference existing terminal endpoints. Every entity has a stable UUID. `schemaVersion` is required. Invariants should be applied before persistence and after import.

## Synchronization contract (future)

- Local changes are appended to an event log with `eventId`, `projectId`, `entityId`, `deviceId`, `baseRevision`, `operation` and `timestamp`.
- Server compares each change against current entity revision.
- Non-conflicting edits can be applied. Conflicts are retained for engineer review.
- Client never silently replaces server data in a conflict.
- Synchronization protocol and offline authentication require dedicated security review.

## Delivery gates

- M0: schema, validation prototype, tests and deploy scaffold.
- M1: create/open/save project plus symbols and connection graph.
- M2: electrically aware 2D editor and reports.
- M3: parametric schematic generation and verified interchange adapters.
- M4: collaborative offline sync and 3D initial prototype.

## Non-goals for M0

Full EPLAN file interoperability, certified electrical design rules, complete CAD editor, production-ready security, finished 3D engine.
