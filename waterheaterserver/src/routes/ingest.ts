
import { WaterHeaterStore } from '../water-heater-store.js';
import { LOGGER } from '../logger.js';
import Router from 'express';

const IngestRouter = (waterHeaterStore: WaterHeaterStore) => {
    const router = Router();

    router.post('/postAll.php', async (req, res) => {
        LOGGER.debug({message: "Got Ingest Request", body: req.body, query: req.query});
        try {
            const waterHeater = await waterHeaterStore.getCreateWaterHeater(req.body);
            res.status(200).json(waterHeater.toResponse());
        } catch (error) {
            res.status(400).send({ success: false, error: (error as Error).message });
        }
    });

    return router;
};

export { IngestRouter };
