# E-Electric

Independent industrial CAD/CAE engineering platform — early proof of concept.

**Status:** initial architectural foundation, not production ready and not affiliated with EPLAN.

## Target
- Windows desktop + browser; offline editing with later synchronization (planned).
- 2–10 engineers initially; local Docker server.
- Engineering Data Model (EDM), own symbols/components, parametrically generated schematics.
- Verified interoperability adapters, with explicit compatibility and loss reports.

## Repository

- `docs/architecture/`: technical decisions and roadmap
- `packages/edm/`: first executable data model validator
- `tests/`: model validation tests
- `infrastructure/docker-compose.yml`: development PostgreSQL

## Test
Node.js 22+ automated checks (Node and Playwright):
```sh
npm ci
npx playwright install chromium
npm test
npm run test:e2e
```
Docker development database:
```sh
cd infrastructure
POSTGRES_PASSWORD=replace-me docker compose up -d
```

**Security:** GitHub repo is currently PUBLIC. Do not commit private projects, credentials, or licensed component catalogs.
