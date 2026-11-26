import { WaterHeater } from './waterheater.js';

export class WaterHeaterStore {
    WATER_HEATERS: Record<string, WaterHeater>;

    constructor() {
        this.WATER_HEATERS = {};
    }

    getCreateWaterHeater = async (queryParams: Record<string, string>): Promise<WaterHeater> => {
        const deviceId = queryParams.DeviceText;

        if (!deviceId) {
            throw new Error('DeviceText is required in queryParams');
        }

        if (deviceId in this.WATER_HEATERS && this.WATER_HEATERS[deviceId]) {
            return this.WATER_HEATERS[deviceId]
        } else {
            const waterHeater = new WaterHeater(deviceId);
            await waterHeater.bootstrap(queryParams);
            this.WATER_HEATERS[deviceId] = waterHeater;

        return waterHeater;
        }
    }
}