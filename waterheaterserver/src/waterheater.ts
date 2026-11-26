import { LOGGER } from "./logger.js";
import { MAPPING, MODE_MAPPING } from './mappings.js';

export const COMMAND_MAPPING = {
    mode: 'Mode',
    updateRate: 'UpdateRate',
    temperature: 'SetPoint',
}

export class WaterHeater {
    pendingCommands = {};
    sensors = {};

    readonly deviceId: string;

    moduleAPI?: string;
    moduleFirmwareVersion?: string; 
    masterFirmwareVersion?: string; 
    masterModelId?:  string;
    displayFirmwareVersion?:  string;
    wifiFirmwareVersion?:  string;
    updateRate?: number;
    mode: string | undefined;
    setPoint: number | undefined;
    units?: string;
    leakDetected?: string;
    maxSetPoint?: number;
    grid?: string;
    airFilterStatus?: string;
    condensePumpFail?: string;
    availableModes?: string[];
    systemInHeating?: string;
    hotWaterVolume?: string;
    leak?: string;
    dryFire?: string;
    elementFail?: string;
    tankSensorFail?: string;
    ecoError?: string;
    masterDisplayFail?: string;
    systemSensorFail?: string;
    compSensorFail?: string;
    systemFail?: string;
    upperTemperature?: number;
    lowerTemperature?: number;
    faultCodes?: string;
    unConnectNumber?: string;
    addressData?: string;
    signalStrength?: string;

    constructor (deviceId: string) {
        this.deviceId = deviceId;
    }

    async bootstrap (queryParams: Record<string, string>) {
        LOGGER.trace({message: "Bootstrapping water heater", deviceId: this.deviceId});
        // await this.handleUpdateRequest(queryParams);
        // await this.createHomeAssistantConfig();
        // await this.listenForCommands();
    }

    // async createUpdateSensor (queryParams, key, type, options = {}) {
    //     LOGGER.trace({message: "Converting key to sensor", key});

    //     if (MAPPING[key] in this.sensors) {
    //         await this.sensors[MAPPING[key]].updateValue(queryParams[key]);
    //     } else {
    //         this.sensors[MAPPING[key]] = new type(MAPPING[key], this, queryParams[key], this.mqtt, options);
    //         await this.sensors[MAPPING[key]].bootstrap();
    //     }
    // }

    async handleUpdateRequest (queryParams: Record<string, string>) {
        const state = this.toStorage();
        const numericValue = (key: string, value: string): number | undefined => {
            if (value === '') return undefined;
            const number = Number(value);
            if (!Number.isFinite(number)) throw new Error(`Invalid numeric value for ${key}`);
            return number;
        };

        for (const [key, value] of Object.entries(queryParams)) {
            if (!Object.hasOwn(MAPPING, key) || key === 'Password' || key === 'DeviceText') continue;
            if (typeof value !== 'string') throw new Error(`Invalid value for ${key}`);
            switch (key) {
                case 'ModuleApi': state.moduleAPI = value; break;
                case 'ModFwVer': state.moduleFirmwareVersion = value; break;
                case 'MasterFwVer': state.masterFirmwareVersion = value; break;
                case 'MasterModelId': state.masterModelId = value; break;
                case 'DisplayFwVer': state.displayFirmwareVersion = value; break;
                case 'WifiFwVer': state.wifiFirmwareVersion = value; break;
                case 'UpdateRate': state.updateRate = numericValue(key, value); break;
                case 'Mode': state.mode = value; break;
                case 'SetPoint': state.setPoint = numericValue(key, value); break;
                case 'Units': state.units = value; break;
                case 'LeakDetect': state.leakDetected = value; break;
                case 'MaxSetPoint': state.maxSetPoint = numericValue(key, value); break;
                case 'Grid': state.grid = value; break;
                case 'AirFilterStatus': state.airFilterStatus = value; break;
                case 'CondensePumpFail': state.condensePumpFail = value; break;
                case 'AvailableModes': state.availableModes = value.split(','); break;
                case 'SystemInHeating': state.systemInHeating = value; break;
                case 'HotWaterVol': state.hotWaterVolume = value; break;
                case 'Leak': state.leak = value; break;
                case 'DryFire': state.dryFire = value; break;
                case 'ElementFail': state.elementFail = value; break;
                case 'TankSensorFail': state.tankSensorFail = value; break;
                case 'EcoError': state.ecoError = value; break;
                case 'MasterDispFail': state.masterDisplayFail = value; break;
                case 'SysSensorFail': state.systemSensorFail = value; break;
                case 'CompSensorFail': state.compSensorFail = value; break;
                case 'SystemFail': state.systemFail = value; break;
                case 'UpperTemp': state.upperTemperature = numericValue(key, value); break;
                case 'LowerTemp': state.lowerTemperature = numericValue(key, value); break;
                case 'FaultCodes': state.faultCodes = value; break;
                case 'UnConnectNumber': state.unConnectNumber = value; break;
                case 'AddrData': state.addressData = value; break;
                case 'SignalStrength': state.signalStrength = value; break;
            }
        }
        Object.assign(this, state);
    }

    toStorage () {
        return {
            deviceId: this.deviceId,
            moduleAPI: this.moduleAPI,
            moduleFirmwareVersion: this.moduleFirmwareVersion,
            masterFirmwareVersion: this.masterFirmwareVersion,
            masterModelId: this.masterModelId,
            displayFirmwareVersion: this.displayFirmwareVersion,
            wifiFirmwareVersion: this.wifiFirmwareVersion,
            updateRate: this.updateRate,
            mode: this.mode,
            setPoint: this.setPoint,
            units: this.units,
            leakDetected: this.leakDetected,
            maxSetPoint: this.maxSetPoint,
            grid: this.grid,
            airFilterStatus: this.airFilterStatus,
            condensePumpFail: this.condensePumpFail,
            availableModes: this.availableModes?.slice(),
            systemInHeating: this.systemInHeating,
            hotWaterVolume: this.hotWaterVolume,
            leak: this.leak,
            dryFire: this.dryFire,
            elementFail: this.elementFail,
            tankSensorFail: this.tankSensorFail,
            ecoError: this.ecoError,
            masterDisplayFail: this.masterDisplayFail,
            systemSensorFail: this.systemSensorFail,
            compSensorFail: this.compSensorFail,
            systemFail: this.systemFail,
            upperTemperature: this.upperTemperature,
            lowerTemperature: this.lowerTemperature,
            faultCodes: this.faultCodes,
            unConnectNumber: this.unConnectNumber,
            addressData: this.addressData,
            signalStrength: this.signalStrength,
        };
    }


    // updatePendingCommands (key, value) {
    //     if (key in COMMAND_MAPPING) {
    //         if (!this.pendingCommands) {
    //             this.pendingCommands = {};
    //         }

    //         switch (key) {
    //             case 'temperature':
    //                 this.pendingCommands[COMMAND_MAPPING[key]] = parseInt(value).toFixed(0);
    //                 break;
    //             default:
    //                 this.pendingCommands[COMMAND_MAPPING[key]] = value;
    //         }
    //     }

    //     LOGGER.trace({message: "Updated Pending Commands", pendingCommands: this.pendingCommands});
    // }

    toResponse () {
        const response = {
            Success: "0",
        }

        // delete this.pendingCommands;

        return response;
    }

    generateDeviceConfig () {
        return {
            device: {
                "identifiers":[this.deviceId],
                "name":`Hot Water Heater ${this.deviceId}`,
                "model_id": this.masterModelId,
                "serial_number": this.deviceId,
                "sw_version": this.masterFirmwareVersion,
            }
        }
    }

    // generateModeMappingTemplate (inverse) {
    //     const mapping = {};

    //     for (const mode of this.availableModes) {
    //         if (mode in MODE_MAPPING) {
    //             if (inverse) {
    //                 mapping[MODE_MAPPING[mode]] = mode;
    //             } else {
    //                 mapping[mode] = MODE_MAPPING[mode];
    //             }
    //         }
    //     }

    //     return `{% set lookup = ${JSON.stringify(mapping)} %}{{- lookup[value] -}}`;
    // }
}