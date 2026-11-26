# E-Electric browser editor POC

Run from repository root with any static HTTP server, for example:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080/apps/web/.

Capabilities: grid, placement of four symbol types, move symbols, edit tags, wire terminal pins, JSON import/export. This is a **prototype**, not a production CAD editor. Browser importer checks only basic structure, not full EDM invariants; do not use untrusted project files. No local autosave, offline sync, DWG or EPLAN import.
