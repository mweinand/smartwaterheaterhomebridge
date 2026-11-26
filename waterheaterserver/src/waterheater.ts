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
    hotWaterVolume?: number;
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
        const keys = Object.keys(queryParams);

        const unit = ('Units' in queryParams ? `°${queryParams['Units']}` : '°F');
        LOGGER.trace({message: 'Got Unit', unit});

        for (const key of keys) {
            LOGGER.trace({message: "Converting key", key});

            if (key in MAPPING) {
                switch (key) {
                    case 'AvailableModes':
                        this['availableModes'] = queryParams[key]?.split(',') ?? [];
                        break;
                    case 'SetPoint':
                        this['setPoint'] = queryParams[key] ? parseInt(queryParams[key]) : undefined;
                        break;
                    case 'Mode':
                        this['mode'] = queryParams[key];
                        break;
                    case 'Grid':
                    case 'SystemInHeating':
                    case 'Leak':
                    case 'LeakDetect':
                    case 'DryFire':
                    case 'ElementFail':
                    case 'TankSensorFail':
                    case 'EcoError':
                    case 'MasterDispFail':
                    case 'CompSensorFail':
                    case 'SysSensorFail':
                    case 'SystemFail':
                    case 'CondensePumpFail':
                        // await this.createUpdateSensor(queryParams, key, BinarySensor, {isDiagnostic: false});
                        break;
                    case 'AirFilterStatus':
                        // await this.createUpdateSensor(queryParams, key, BinarySensor, {isDiagnostic: false, inverse: true});
                        break;
                    case 'FaultCodes':
                    case 'HotWaterVol':
                        // await this.createUpdateSensor(queryParams, key, Sensor, {isDiagnostic: false});
                        break;
                    case 'LowerTemp':
                    case 'UpperTemp':
                    case 'MaxSetPoint':
                        //await this.createUpdateSensor(queryParams, key, Sensor, {isDiagnostic: false, unit});
                        break;
                    case 'ModuleApi':
                    case 'ModFwVer':
                    case 'MasterFwVer':
                    case 'MasterModelId':
                    case 'DisplayFwVer':
                    case 'WifiFwVer':
                    case 'UnConnectNumber':
                    case 'AddrData':
                    case 'SignalStrength':
                        //await this.createUpdateSensor(queryParams, key, Sensor, {isDiagnostic: true});
                        break;
                    case 'UpdateRate':
                        //await this.createUpdateSensor(queryParams, key, NumberSensor, {isDiagnostic: true, max: 600, min: 30});
                        break;
                    default:
                        //convertedParams[MAPPING[key]] = queryParams[key];
                }
            }
        }
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