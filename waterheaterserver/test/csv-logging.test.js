import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { CsvWriteError, CsvWriter } from '../dist/src/csv-writer.js';
import { IngestRouter } from '../dist/src/routes/ingest.js';
import { WaterHeaterStore } from '../dist/src/water-heater-store.js';
import { WaterHeater } from '../dist/src/waterheater.js';

async function temporaryDirectory(t) {
    const directory = await mkdtemp(join(tmpdir(), 'water-heater-test-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    return directory;
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted && char === '"' && text[i + 1] === '"') {
            field += '"';
            i++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (!quoted && (char === ',' || char === '\n')) {
            row.push(field);
            field = '';
            if (char === '\n') {
                rows.push(row);
                row = [];
            }
        } else {
            field += char;
        }
    }
    assert.equal(quoted, false);
    return rows;
}

async function records(path) {
    const [header, ...rows] = parseCsv(await readFile(path, 'utf8'));
    return rows.map(row => Object.fromEntries(header.map((key, index) => [key, row[index]])));
}

test('captures all recognized state, retains omitted values, and excludes credentials', async () => {
    const heater = new WaterHeater('device-1');
    await heater.handleUpdateRequest({
        DeviceText: 'device-1', Password: 'test-secret', ModuleApi: '1.5', ModFwVer: '3.1',
        MasterFwVer: '02.06', MasterModelId: 'B2.00', DisplayFwVer: '00.00',
        WifiFwVer: 'C2', UpdateRate: '300', Mode: 'Hybrid', SetPoint: '123', Units: 'F',
        LeakDetect: 'NotDetected', MaxSetPoint: '126', Grid: 'Disabled',
        AvailableModes: 'Efficiency,Hybrid', SystemInHeating: 'False', HotWaterVol: 'High',
        Leak: 'None', DryFire: 'None', ElementFail: 'None', TankSensorFail: 'None',
        EcoError: 'False', MasterDispFail: 'None', CompSensorFail: 'None',
        SysSensorFail: 'None', SystemFail: 'None', CondensePumpFail: 'False',
        AirFilterStatus: 'OK', UpperTemp: '120', LowerTemp: '119', FaultCodes: '0',
        UnConnectNumber: '10', AddrData: '05FD|00D9', SignalStrength: '-59',
        Unknown: 'not logged',
    });
    const first = heater.toStorage();
    assert.deepEqual(first, {
        deviceId: 'device-1', moduleAPI: '1.5', moduleFirmwareVersion: '3.1',
        masterFirmwareVersion: '02.06', masterModelId: 'B2.00', displayFirmwareVersion: '00.00',
        wifiFirmwareVersion: 'C2', updateRate: 300, mode: 'Hybrid', setPoint: 123, units: 'F',
        leakDetected: 'NotDetected', maxSetPoint: 126, grid: 'Disabled', airFilterStatus: 'OK',
        condensePumpFail: 'False', availableModes: ['Efficiency', 'Hybrid'],
        systemInHeating: 'False', hotWaterVolume: 'High', leak: 'None', dryFire: 'None',
        elementFail: 'None', tankSensorFail: 'None', ecoError: 'False', masterDisplayFail: 'None',
        systemSensorFail: 'None', compSensorFail: 'None', systemFail: 'None',
        upperTemperature: 120, lowerTemperature: 119, faultCodes: '0', unConnectNumber: '10',
        addressData: '05FD|00D9', signalStrength: '-59',
    });
    await heater.handleUpdateRequest({ Mode: 'Electric' });
    assert.equal(heater.toStorage().mode, 'Electric');
    assert.equal(heater.toStorage().hotWaterVolume, 'High');
    assert.equal(first.mode, 'Hybrid');
    await assert.rejects(heater.handleUpdateRequest({ Mode: 'Vacation', UpperTemp: 'invalid' }));
    assert.equal(heater.toStorage().mode, 'Electric');
});

test('writes escaped snapshots with one header and rotates at UTC midnight', async t => {
    const root = await temporaryDirectory(t);
    const writer = new CsvWriter(root);
    const heater = new WaterHeater('device_1');
    await heater.handleUpdateRequest({
        Mode: 'line 1,\n"line 2"', AvailableModes: 'Hybrid,Electric', Password: 'test-secret',
    });
    const state = heater.toStorage();
    await writer.withDeviceLock(state.deviceId, async () => {
        await writer.writeWaterHeaterState(state, new Date('2026-01-02T00:30:00+01:00'));
        await writer.writeWaterHeaterState(state, new Date('2026-01-01T23:59:59Z'));
        await writer.writeWaterHeaterState(state, new Date('2026-01-02T00:00:00Z'));
    });
    const first = await records(join(root, 'device_1', 'device_1-20260101.csv'));
    const next = await records(join(root, 'device_1', 'device_1-20260102.csv'));
    assert.equal(first.length, 2);
    assert.equal(next.length, 1);
    assert.equal(first[0].timestamp, '2026-01-01T23:30:00.000Z');
    assert.equal(first[0].mode, 'line 1,\n"line 2"');
    assert.deepEqual(JSON.parse(first[0].availableModes), ['Hybrid', 'Electric']);
    assert.equal(Object.hasOwn(first[0], 'password'), false);
    assert.equal((await readFile(join(root, 'device_1', 'device_1-20260101.csv'), 'utf8')).includes('test-secret'), false);
});

test('retains the newest matching files per device and validates the limit', async t => {
    const root = await temporaryDirectory(t);
    for (const limit of ['0', '-1', '1.5', '', '9007199254740992']) {
        assert.throws(() => new CsvWriter(root, limit), /positive integer/);
    }
    const writer = new CsvWriter(root, '2');
    const heater = new WaterHeater('device-1');
    const state = heater.toStorage();
    await mkdir(join(root, state.deviceId), { recursive: true });
    await writeFile(join(root, state.deviceId, 'unrelated.csv'), 'keep');
    await mkdir(join(root, 'device-2'));
    await writeFile(join(root, 'device-2', 'device-2-20200101.csv'), 'keep');
    for (const day of ['01', '02', '03']) {
        await writer.withDeviceLock(state.deviceId, () =>
            writer.writeWaterHeaterState(state, new Date(`2026-01-${day}T12:00:00Z`)));
    }
    assert.deepEqual((await readdir(join(root, state.deviceId))).sort(),
        ['device-1-20260102.csv', 'device-1-20260103.csv', 'unrelated.csv']);
    assert.equal(await readFile(join(root, 'device-2', 'device-2-20200101.csv'), 'utf8'), 'keep');
});

test('default retention keeps exactly 90 daily files', async t => {
    const root = await temporaryDirectory(t);
    const previous = process.env.CSV_LOG_RETENTION;
    delete process.env.CSV_LOG_RETENTION;
    let writer;
    try {
        writer = new CsvWriter(root);
    } finally {
        if (previous !== undefined) process.env.CSV_LOG_RETENTION = previous;
    }
    const heater = new WaterHeater('default-device');
    const directory = join(root, heater.deviceId);
    await mkdir(directory);
    const day = index => new Date(Date.UTC(2026, 0, 1 + index));
    const filename = index => `default-device-${day(index).toISOString().slice(0, 10).replaceAll('-', '')}.csv`;
    await Promise.all(Array.from({ length: 90 }, (_, index) =>
        writeFile(join(directory, filename(index)), 'existing\n')));
    await writer.withDeviceLock(heater.deviceId, () => writer.writeWaterHeaterState(heater.toStorage(), day(90)));
    const files = await readdir(directory);
    assert.equal(files.length, 90);
    assert.equal(files.includes(filename(0)), false);
    assert.equal(files.includes(filename(90)), true);
});

test('serializes concurrent device updates and rejects unsafe identifiers', async t => {
    const root = await temporaryDirectory(t);
    const writer = new CsvWriter(root);
    const store = new WaterHeaterStore();
    for (const id of ['', '../escape', 'a/b', '.', 10, undefined]) {
        await assert.rejects(writer.withDeviceLock(id, async () => {}), /DeviceText/);
    }
    await Promise.all(Array.from({ length: 30 }, (_, index) =>
        writer.withDeviceLock('__proto__', async () => {
            const heater = await store.getCreateWaterHeater({ DeviceText: '__proto__' });
            await heater.handleUpdateRequest({ Mode: `mode-${index}`, SetPoint: String(index) });
            await writer.writeWaterHeaterState(heater.toStorage(), new Date('2026-01-01T12:00:00Z'));
        })));
    const rows = await records(join(root, '__proto__', '__proto__-20260101.csv'));
    assert.equal(rows.length, 30);
    assert.deepEqual(rows.map(row => [row.mode, row.setPoint]),
        Array.from({ length: 30 }, (_, index) => [`mode-${index}`, String(index)]));
});

test('ingest acknowledges writes and reports invalid IDs and storage failures', async t => {
    const root = await temporaryDirectory(t);
    const app = express();
    app.use(express.json());
    app.use('/ok', IngestRouter(new WaterHeaterStore(), new CsvWriter(root)));
    const file = join(root, 'not-a-directory');
    await writeFile(file, 'x');
    app.use('/fail', IngestRouter(new WaterHeaterStore(), new CsvWriter(file)));
    const server = await new Promise(resolve => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const url = `http://127.0.0.1:${server.address().port}`;
    const post = (path, body) => fetch(`${url}${path}/postAll.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const success = await post('/ok', { DeviceText: 'sample', Mode: 'Hybrid' });
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { Success: '0' });
    const concurrent = await Promise.all(Array.from({ length: 8 }, (_, index) =>
        post('/ok', { DeviceText: 'sample', Mode: `mode-${index}`, SetPoint: String(index) })));
    assert.ok(concurrent.every(response => response.status === 200));
    const files = await readdir(join(root, 'sample'));
    const rows = (await Promise.all(files.map(name => records(join(root, 'sample', name))))).flat();
    assert.equal(rows.length, 9);
    for (const row of rows.filter(row => row.mode.startsWith('mode-'))) {
        assert.equal(row.mode, `mode-${row.setPoint}`);
    }
    assert.equal((await post('/ok', { DeviceText: '../unsafe' })).status, 400);
    const failure = await post('/fail', { DeviceText: 'sample' });
    assert.equal(failure.status, 500);
    assert.deepEqual(await failure.json(), { success: false, error: 'Failed to write or retain CSV logs' });
    assert.ok(new CsvWriteError(new Error('disk')).cause);
});
