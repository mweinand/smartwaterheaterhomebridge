import express from 'express';
import { WaterHeaterStore } from '../water-heater-store.js';

const WaterHeatersRouter = (waterHeaterStore: WaterHeaterStore) => {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const waterHeaters = await waterHeaterStore.getAllWaterHeaters();
            const waterHeatersResponse = waterHeaters.map(wh => {
                return {
                    deviceId: wh.deviceId,
                    status: wh.mode,
                    setPoint: wh.setPoint,
                    lastUpdated: wh.lastUpdated
                }
            });
            res.status(200).json(waterHeatersResponse);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ success: false, error: errorMessage });
        }
    });

    router.get('/:deviceId', async (req, res) => {
        try {
            const waterHeater = await waterHeaterStore.getWaterHeater(req.params.deviceId);
            if (!waterHeater) {
                res.status(404).json({ success: false, error: 'Water heater not found' });
                return;
            }
            res.status(200).json({ success: true, data: waterHeater.toStorage() });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ success: false, error: errorMessage });
        }
    });

    return router;
};

export { WaterHeatersRouter };