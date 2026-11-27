import { mkdir, open, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { validateDeviceId } from './device-id.js';
import type { WaterHeater } from './waterheater.js';

type WaterHeaterState = ReturnType<WaterHeater['toStorage']>;

export class CsvWriteError extends Error {
    constructor(cause: unknown) {
        super('Failed to write or retain CSV logs', { cause });
        this.name = 'CsvWriteError';
    }
}

export class CsvWriter {
    private readonly locks = new Map<string, Promise<void>>();
    private readonly retentionLimit: number;

    constructor(
        private readonly logsDirectory = 'logs',
        retentionLimit = process.env.CSV_LOG_RETENTION ?? '90',
    ) {
        if (!/^[1-9]\d*$/.test(retentionLimit) || !Number.isSafeInteger(Number(retentionLimit))) {
            throw new Error('CSV_LOG_RETENTION must be a positive integer');
        }
        this.retentionLimit = Number(retentionLimit);
    }

    async withDeviceLock<T>(deviceId: unknown, operation: () => Promise<T>): Promise<T> {
        validateDeviceId(deviceId);
        const previous = this.locks.get(deviceId) ?? Promise.resolve();
        let release!: () => void;
        const finished = new Promise<void>(resolve => { release = resolve; });
        const current = previous.then(() => finished);
        this.locks.set(deviceId, current);
        await previous;
        try {
            return await operation();
        } finally {
            release();
            if (this.locks.get(deviceId) === current) this.locks.delete(deviceId);
        }
    }

    async writeWaterHeaterState(state: WaterHeaterState): Promise<void> {
        validateDeviceId(state.deviceId);
        const date = state.lastUpdated.toISOString().slice(0, 10).replaceAll('-', '');
        const directory = join(this.logsDirectory, state.deviceId);
        const filename = `${state.deviceId}-${date}.csv`;
        const csvValue = (value: string | Date |number | string[] | undefined): string => {
            const text = Array.isArray(value) ? JSON.stringify(value) : String(value ?? '');
            return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        };
        const header = ['timestamp', ...Object.keys(state)].map(csvValue).join(',');
        const row = [state.lastUpdated.toISOString(), ...Object.values(state)].map(csvValue).join(',');

        try {
            await mkdir(directory, { recursive: true });
            const file = await open(join(directory, filename), 'a+');
            try {
                const isEmpty = (await file.stat()).size === 0;
                await file.appendFile(`${isEmpty ? `${header}\n` : ''}${row}\n`);
            } finally {
                await file.close();
            }

            const prefix = `${state.deviceId}-`;
            const files = (await readdir(directory, { withFileTypes: true }))
                .filter(entry => entry.isFile() && entry.name.startsWith(prefix)
                    && /^\d{8}\.csv$/.test(entry.name.slice(prefix.length)))
                .map(entry => entry.name)
                .sort()
                .reverse();
            for (const oldFile of files.slice(this.retentionLimit)) {
                await unlink(join(directory, oldFile));
            }
        } catch (error) {
            throw new CsvWriteError(error);
        }
    }
}
