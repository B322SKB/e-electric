import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

test('alpha editor saves, survives restart, imports exports, and rejects stale tab writes', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'e-electric-e2e-'));
  const backupDir = await mkdtemp(join(tmpdir(), 'e-electric-backup-'));
  const browser = await chromium.launch({ headless: true });
  const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
  let server;
  let context;
  const startServer = () => new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['backend/api/alpha.mjs'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, EE_DATA_DIR: dataDir, PORT: '0' }
    });
    let output = '';
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    server.stdout.on('data', chunk => {
      output += chunk.toString();
      const match = output.match(/E-Electric Alpha: http:\/\/([^:\s]+):(\d+)/);
      if (match && !settled) {
        if (match[1] !== '127.0.0.1') {
          fail(new Error(`Alpha must bind to loopback, got ${match[1]}`));
          return;
        }
        settled = true;
        resolve(`http://${match[1]}:${match[2]}`);
      }
    });
    server.stderr.on('data', chunk => { output += chunk.toString(); });
    server.once('error', fail);
    server.once('exit', (code, signal) => fail(new Error(`Alpha process exited (${code ?? signal}): ${output}`)));
  });
  const stopServer = async () => {
    const child = server;
    server = undefined;
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
  };
  const openSavedProject = async page => {
    page.on('dialog', async dialog => await dialog.accept(dialog.type() === 'prompt' ? '1' : undefined));
    await page.getByRole('button', { name: 'Open server' }).click();
  };
  const setSelectedTag = async (page, tag) => {
    const input = page.locator('#properties input');
    await input.fill(tag);
    await input.press('Tab');
  };

  t.after(async () => {
    await context?.close();
    await stopServer();
    await browser.close();
    await rm(dataDir, { recursive: true, force: true });
    await rm(backupDir, { recursive: true, force: true });
  });

  let baseURL = await startServer();
  context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'Contactor coil' }).click();
  await page.locator('#canvas').click({ position: { x: 180, y: 160 } });
  await page.locator('[data-tool="switch"]').click();
  await page.locator('#canvas').click({ position: { x: 420, y: 160 } });

  assert.equal(await page.locator('.symbol').count(), 2, await page.locator('#status').textContent());
  await page.locator('[data-tool="select"]').click();
  await page.locator('.symbol').first().click();
  assert.equal(await page.locator('#properties input').count(), 1, await page.locator('#status').textContent());
  const selectedSymbol = page.locator('.symbol').first();
  const originalTransform = await selectedSymbol.getAttribute('transform');
  const bounds = await selectedSymbol.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 48, bounds.y + bounds.height / 2 + 24, { steps: 3 });
  await page.mouse.up();
  assert.notEqual(await page.locator('.symbol').first().getAttribute('transform'), originalTransform);
  await setSelectedTag(page, '-K1A');
  await page.getByRole('button', { name: 'Connect terminals' }).click();
  await page.locator('.pin').nth(0).click();
  await page.locator('.pin').nth(3).click();
  await page.getByRole('button', { name: 'Save server' }).click();
  await page.getByText('revision 1').waitFor();
  await page.getByRole('button', { name: 'Save server' }).click();
  await page.getByText('revision 2').waitFor();
  assert.equal(await page.locator('line.wire').count(), 1);

  await context.close();
  context = undefined;
  await stopServer();
  await cp(dataDir, backupDir, { recursive: true });
  await rm(dataDir, { recursive: true, force: true });
  await cp(backupDir, dataDir, { recursive: true });
  baseURL = await startServer();
  context = await browser.newContext({ acceptDownloads: true });
  const reopened = await context.newPage();
  reopened.on('pageerror', error => pageErrors.push(error.message));
  await reopened.goto(baseURL);
  await openSavedProject(reopened);
  await reopened.getByText('Opened revision 2').waitFor({ timeout: 5000 }).catch(async () => {
    assert.fail(`Open failed: ${await reopened.locator('#status').textContent()}; projects=${JSON.stringify(await (await fetch(`${baseURL}/api/projects`)).json())}`);
  });
  assert.deepEqual(await reopened.locator('.tag').allTextContents(), ['-K1A', '-S2']);
  assert.equal(await reopened.locator('line.wire').count(), 1);

  const staleTab = await context.newPage();
  staleTab.on('pageerror', error => pageErrors.push(error.message));
  await staleTab.goto(baseURL);
  await openSavedProject(staleTab);
  await staleTab.getByText('Opened revision 2').waitFor();
  await reopened.locator('.symbol').first().click();
  await setSelectedTag(reopened, '-K1B');
  await reopened.getByRole('button', { name: 'Save server' }).click();
  await reopened.getByText('revision 3').waitFor();
  await staleTab.locator('.symbol').first().click();
  await setSelectedTag(staleTab, '-K1C');
  await staleTab.getByRole('button', { name: 'Save server' }).click();
  await staleTab.getByText('Server request failed: 409').waitFor();

  const downloadPromise = reopened.waitForEvent('download');
  await reopened.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  const exportedPath = join(dataDir, download.suggestedFilename());
  await download.saveAs(exportedPath);
  const exported = JSON.parse(await readFile(exportedPath, 'utf8'));
  assert.equal(exported.devices.length, 2);
  assert.equal(exported.connections.length, 1);
  await reopened.locator('#file').setInputFiles(exportedPath);
  await reopened.getByText('Imported JSON project (structural checks only)').waitFor();
  assert.deepEqual(await reopened.locator('.tag').allTextContents(), ['-K1B', '-S2']);
  assert.equal(await reopened.locator('line.wire').count(), 1);

  await reopened.locator('[data-tool="motor"]').click();
  await reopened.locator('#canvas').click({ position: { x: 620, y: 160 } });
  await reopened.locator('[data-tool="select"]').click();
  const motorSymbol = reopened.locator('.symbol').nth(2);
  await motorSymbol.click();
  assert.equal(await motorSymbol.locator('.pin').count(), 4);
  assert.deepEqual(await motorSymbol.locator('.pin').evaluateAll(pins => pins.map(pin => [pin.getAttribute('cx'), pin.getAttribute('cy')])), [['-40','-16'],['-40','0'],['-40','16'],['40','0']]);
  assert.match(await reopened.locator('#properties .hint').textContent(), /Terminals: U, V, W, PE/);
  await reopened.evaluate(() => { window.__printWasCalled = false; window.print = () => { window.__printWasCalled = true; }; });
  await reopened.getByRole('button', { name: 'Print / Save as PDF' }).click();
  assert.equal(await reopened.evaluate(() => window.__printWasCalled), true);
  await reopened.emulateMedia({ media: 'print' });
  assert.equal(await reopened.locator('#print-title').textContent(), 'New Electrical Project');
  assert.equal(await reopened.locator('#canvas').evaluate(canvas => getComputedStyle(canvas).backgroundColor), 'rgb(255, 255, 255)');
  const pdfPath = join(dataDir, 'schematic.pdf');
  await reopened.pdf({ path: pdfPath, format: 'A4', landscape: true, printBackground: true });
  assert.equal((await readFile(pdfPath)).subarray(0, 5).toString('ascii'), '%PDF-');
  await reopened.emulateMedia({ media: 'screen' });
  assert.deepEqual(pageErrors, []);
});
