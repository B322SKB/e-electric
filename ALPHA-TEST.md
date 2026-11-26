# E-Electric v0.1 Alpha — Windows local test candidate

Install Node.js 22 LTS. Download ZIP of branch release/v0.1-alpha, extract to a writable local folder, run start-alpha.cmd, then open http://localhost:8081. No npm install or Docker required for this single-user mode. Keep the command window open. Use only one server process per data directory.

## Acceptance checklist
1. Place a coil and switch, move them, edit a tag, connect two pins.
2. Save server; expect revision 1. Open server and select the saved project.
3. Modify and save; expect revision 2.
4. Stop server (Ctrl+C), restart, open project and verify drawing and wires.
5. Print/save the drawing as an A4 landscape PDF. Export JSON; import as a new project; save.
6. Open same saved project in two browser tabs; save in first, then second; expect 409 in second, no overwrite.
7. Record failures with step, expected/actual, screenshot, browser console and terminal output. Do not include secrets or client projects.

Data lives in data/alpha. Stop server before copying this folder for backup. Local file storage is a temporary single-process alternative to PostgreSQL. No authentication, no remote exposure, no certified electrical design, no EPLAN import. Browser runtime and Windows restart behavior must be verified before acceptance. Run `npm ci`, `npx playwright install chromium`, `npm test`, and `npm run test:e2e` for automated checks.
