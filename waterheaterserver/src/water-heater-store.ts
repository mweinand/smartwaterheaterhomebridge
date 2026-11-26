import { WaterHeater } from './waterheater.js';
import { validateDeviceId } from './device-id.js';

export class WaterHeaterStore {
    WATER_HEATERS: Record<string, WaterHeater>;

    constructor() {
        this.WATER_HEATERS = Object.create(null);
    }

    getCreateWaterHeater = async (queryParams: Record<string, string>): Promise<WaterHeater> => {
        const deviceId = queryParams.DeviceText;

        validateDeviceId(deviceId);

        if (Object.hasOwn(this.WATER_HEATERS, deviceId) && this.WATER_HEATERS[deviceId]) {
            return this.WATER_HEATERS[deviceId]
        } else {
            const waterHeater = new WaterHeater(deviceId);
            await waterHeater.bootstrap(queryParams);
            this.WATER_HEATERS[deviceId] = waterHeater;

        return waterHeater;
        }
    }
}