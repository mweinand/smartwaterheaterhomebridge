import express from 'express';
import { fileURLToPath } from 'node:url';

const adminDirectory = fileURLToPath(new URL('../../../admin/dist/', import.meta.url));

export const AdminRouter = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        const [path] = req.originalUrl.split('?');
        if (path === '/admin') {
            res.redirect(308, `/admin/${req.originalUrl.slice(path.length)}`);
            return;
        }
        next();
    });
    router.use(express.static(adminDirectory));
    router.get('/water-heaters/:deviceId', (_req, res) => {
        res.sendFile('index.html', { root: adminDirectory });
    });
    return router;
};
