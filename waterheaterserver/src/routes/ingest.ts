
import { WaterHeaterStore } from '../water-heater-store.js';
import { CsvWriteError, CsvWriter } from '../csv-writer.js';
import { LOGGER } from '../logger.js';
import Router from 'express';

const IngestRouter = (waterHeaterStore: WaterHeaterStore, csvWriter: CsvWriter) => {
    const router = Router();

    router.post('/postAll.php', async (req, res) => {
        LOGGER.debug({message: "Got Ingest Request", body: req.body, query: req.query});
        try {
            const response = await csvWriter.withDeviceLock(req.body?.DeviceText, async () => {
                const waterHeater = await waterHeaterStore.getCreateWaterHeater(req.body);
                await waterHeater.handleUpdateRequest(req.body);
                await csvWriter.writeWaterHeaterState(waterHeater.toStorage());
                return waterHeater.toIngestResponse();
            });
            res.status(200).json(response);
        } catch (error) {
            if (error instanceof CsvWriteError) {
                LOGGER.error({ message: 'Failed to persist water heater state', err: error });
                res.status(500).send({ success: false, error: error.message });
            } else {
                res.status(400).send({ success: false, error: (error as Error).message });
            }
        }
    });

    return router;
};

export { IngestRouter };
