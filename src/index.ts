import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import User from './models/User';

import authRoutes from './routes/auth';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const apiRouter = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

apiRouter.get('/status', (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// auth routes
apiRouter.use('/', authRoutes);

app.use('/api', apiRouter);

app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});



app.listen({ port: PORT, host: HOST }, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});

