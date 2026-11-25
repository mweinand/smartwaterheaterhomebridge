import express from 'express';
import bodyParser from 'body-parser';
import { LOGGER } from './src/logger.js';
import { WaterHeater } from './src/waterheater.js';

LOGGER.debug({message: 'Loaded Server'});

const WATER_HEATERS: Record<string, WaterHeater> = {};

const app = express();
app.disable('x-powered-by');
app.use(bodyParser.json()); // support json encoded bodies
app.use(express.urlencoded({ extended: true })); // support encoded bodies

const getCreateWaterHeater = async (queryParams: Record<string, string>): Promise<WaterHeater> => {
    const deviceId = queryParams.DeviceText;

    if (!deviceId) {
        throw new Error('DeviceText is required in queryParams');
    }

    if (deviceId in WATER_HEATERS && WATER_HEATERS[deviceId]) {
        await WATER_HEATERS[deviceId].convertQueryParams(queryParams);
        return WATER_HEATERS[deviceId]
    } else {
        const waterHeater = new WaterHeater();
        await waterHeater.bootstrap(queryParams);
        WATER_HEATERS[deviceId] = waterHeater;

       return waterHeater;
    }
}

app.use(async (req, res) => {
    // ignore empty payloads
    if (Object.keys(req.body || {}).length === 0) {
        return;
    }

    LOGGER.debug({message: "Got Request", body: req.body, path: req.path});
    const waterHeater = await getCreateWaterHeater(req.body);
    res.status(200).end(JSON.stringify(waterHeater.toResponse()));
})

app.listen(8001);

LOGGER.info({message: "Server listening on 8001"});