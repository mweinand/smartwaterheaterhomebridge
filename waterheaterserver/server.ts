import express from 'express';
import bodyParser from 'body-parser';
import { LOGGER } from './src/logger.js';
import { WaterHeaterStore } from './src/water-heater-store.js';
import { CsvWriter } from './src/csv-writer.js';
import { IngestRouter } from './src/routes/ingest.js';

LOGGER.debug({message: 'Loaded Server'});

const waterHeaterStore: WaterHeaterStore = new WaterHeaterStore();
const csvWriter = new CsvWriter();

const app = express();
app.disable('x-powered-by');
app.use(bodyParser.json()); // support json encoded bodies
app.use(express.urlencoded({ extended: true })); // support encoded bodies

// log all requests
app.use(async (req, res, next) => {
    LOGGER.debug({message: "Got Request", body: req.body, path: req.path, method: req.method});

    // ignore empty payloads
    if (Object.keys(req.body || {}).length === 0) {
        // short circuit
        LOGGER.warn({message: "Empty payload received"});
        res.status(200).send({ success: false, error: "Empty payload" });
        return;
    }

    return next();
})

app.use('/~branecky', IngestRouter(waterHeaterStore, csvWriter));

app.listen(8001);

LOGGER.info({message: "Server listening on 8001"});