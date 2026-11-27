import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { AdminRouter } from '../../dist/src/routes/admin.js';
import { IngestRouter } from '../../dist/src/routes/ingest.js';
import { WaterHeatersRouter } from '../../dist/src/routes/water-heaters.js';
import { WaterHeaterStore } from '../../dist/src/water-heater-store.js';
import { CsvWriter } from '../../dist/src/csv-writer.js';

test('serves admin assets without interfering with the API or ingest', async t => {
  const logs = await mkdtemp(join(tmpdir(), 'admin-test-'));
  t.after(() => rm(logs, { recursive: true, force: true }));
  const store = new WaterHeaterStore();
  const app = express();
  app.use(express.json());
  app.use('/~branecky', IngestRouter(store, new CsvWriter(logs)));
  app.use('/water-heaters', WaterHeatersRouter(store));
  app.use('/admin', AdminRouter());
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const redirect = await fetch(`${base}/admin?test=1`, { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), '/admin/?test=1');
  const page = await fetch(`${base}/admin/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  const asset = html.match(/src="(\/admin\/assets\/[^"]+)"/)?.[1];
  assert.ok(asset);
  assert.equal((await fetch(base + asset)).status, 200);
  assert.equal((await fetch(`${base}/admin/assets/missing.js`)).status, 404);
  const detailPage = await fetch(`${base}/admin/water-heaters/test-device?reload=1`);
  assert.equal(detailPage.status, 200);
  assert.equal(await detailPage.text(), html);
  assert.equal((await fetch(`${base}/admin/other`)).status, 404);
  assert.deepEqual(await (await fetch(`${base}/water-heaters`)).json(), []);
  const ingest = await fetch(`${base}/~branecky/postAll.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DeviceText: 'test-device', Mode: 'Hybrid', SetPoint: '120' }),
  });
  assert.equal(ingest.status, 200);
  const heaters = await (await fetch(`${base}/water-heaters`)).json();
  assert.equal(heaters.length, 1);
  assert.equal(heaters[0].deviceId, 'test-device');
  assert.equal(heaters[0].status, 'Hybrid');
  assert.equal(heaters[0].setPoint, 120);
  const details = await (await fetch(`${base}/water-heaters/test-device`)).json();
  assert.equal(details.success, true);
  assert.equal(details.data.deviceId, 'test-device');
  assert.equal(details.data.mode, 'Hybrid');
  assert.equal(details.data.setPoint, 120);
  assert.equal((await fetch(`${base}/water-heaters/missing`)).status, 404);
});
