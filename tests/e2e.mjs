import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { createApi } from '../backend/api/server.mjs';
import { fileStore } from '../backend/api/file-store.mjs';

test('alpha editor saves, survives restart, imports exports, and rejects stale tab writes', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'e-electric-e2e-'));
  const browser = await chromium.launch({ headless: true });
  let server;
  let context;
  const startServer = async () => {
    server = createApi(fileStore(dataDir));
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    return `http://127.0.0.1:${server.address().port}`;
  };
  const stopServer = async () => {
    if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
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
  assert.deepEqual(pageErrors, []);
});
