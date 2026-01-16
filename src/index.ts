import 'reflect-metadata'; 
import './config/sequelize';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupSwagger } from './swagger';
import authRoutes from './routes/auth';
import usersRouter from './routes/user';
import filesRouter from './routes/file';
import { requireAuth } from './middleware/auth';
import cookieParser from 'cookie-parser';
import folderRouter from './routes/folder';
import trashRouter from './routes/trash';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const apiRouter = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    if (req.path.includes('/login') || req.path.includes('/auth')) {
        console.log(`[DEBUG] Requête reçue sur ${req.path}`);
        console.log('[DEBUG] Headers Content-Type:', req.headers['content-type']);
        console.log('[DEBUG] Body:', req.body);
    }
    next();
});

app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

app.use(cookieParser());


apiRouter.get('/status', (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// auth routes
apiRouter.use('/', authRoutes);
apiRouter.use('/users', requireAuth, usersRouter);
apiRouter.use('/files', requireAuth, filesRouter)
apiRouter.use('/folders', requireAuth, folderRouter);
apiRouter.use('/trash', requireAuth, trashRouter);

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

