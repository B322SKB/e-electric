# POC 2 persistence and catalog

The revision-aware in-memory store validates EDM before writing, returns isolated snapshots and rejects stale revisions. The PostgreSQL adapter persists JSONB snapshots with revision-conditional writes. Integration coverage exercises round-trip, stale and concurrent writes, plus backup/restore into an empty database. The local file store has a tested stop-copy-restore-restart drill. Desktop adapter: SQLite.

The initial catalog defines four original generic symbol types with named terminals. Device creation in the browser and editor model uses those catalog definitions; the motor renders its three phase terminals and PE separately. The catalog is not an IEC-certified symbol library, and projects do not yet lock a catalog version.

Acceptance: automated tests cover round-trip, stale writes, invalid records, catalog lookup, PostgreSQL persistence and backup/restore. The browser editor uses catalog-defined terminal names and multi-terminal motor rendering.
