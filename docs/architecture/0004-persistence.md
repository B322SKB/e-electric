# POC 2 persistence and catalog

The revision-aware in-memory store validates EDM before writing, returns isolated snapshots and rejects stale revisions. It is a contract prototype, not durable persistence. Next adapter: PostgreSQL with transactional compare-and-swap on revision and JSONB payload. Desktop adapter: SQLite.

The initial catalog defines four original generic symbol types with named terminals. It is not an IEC-certified symbol library. The browser editor still uses its own temporary two-terminal definitions; integration and multi-terminal rendering are required before using the catalog in the editor.

Acceptance: automated tests for round-trip, stale writes, invalid records and catalog lookup. Durable restart tests and browser integration are outstanding.
