# Delivery roadmap and acceptance gates

## POC 0 (current)
- Create a new branch, document architecture and repository conventions.
- Validate a representative electrical model with automated tests.
- Supply a development-only PostgreSQL Docker scaffold.
- No claim of GUI, import or export readiness.

## POC 1
- Add a persisted project store and API with revision-safe writes.
- Implement library symbol definitions (versioned and validated).
- Implement 2D viewer/editing with device-to-symbol references.
- Export drawing PDF and structured JSON.

## POC 2
- Parametric motor starter and pump-control schematics.
- Rule engine with warnings and errors.
- Terminal/wire lists reproducible by project revision.

## Interoperability gate
- Acquire legally exportable EPLAN interchange samples, including exact version.
- Write importer fixture tests before implementation.
- Compare device, symbol, endpoint, reference and page counts.
- Report any semantic losses. Do not infer connectivity from DXF/PDF geometry.

## Reliability gate
- Offline desktop local store, event journal, conflict detection, reconciliation.
- Backup/restore drill, access-control testing, version migration.
