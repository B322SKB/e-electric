# POC 2 persistence and catalog

The revision-aware in-memory store validates EDM before writing, returns isolated snapshots and rejects stale revisions. It is a contract prototype, not durable persistence. Next adapter: PostgreSQL with transactional compare-and-swap on revision and JSONB payload. Desktop adapter: SQLite.

The initial catalog defines four original generic symbol types with named terminals. Device creation in the browser and editor model uses those catalog definitions; the motor renders its three phase terminals and PE separately. The catalog is not an IEC-certified symbol library, and projects do not yet lock a catalog version.

Acceptance: automated tests for round-trip, stale writes, invalid records and catalog lookup. Durable restart tests and browser integration are outstanding.
