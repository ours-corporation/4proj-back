import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import User from './models/User';
import cors from 'cors';
import { setupSwagger } from './swagger';
import authRoutes from './routes/auth';
import usersRouter from './routes/user';
import { requireAuth } from './middleware/auth';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const apiRouter = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // si tu veux gérer les cookies
}));

apiRouter.get('/status', (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// auth routes
apiRouter.use('/', authRoutes);
apiRouter.use('/users', requireAuth, usersRouter);

app.use('/api', apiRouter);

setupSwagger(app);

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

