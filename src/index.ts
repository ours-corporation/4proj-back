import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.get('/hello', (req: Request, res: Response) => {
    res.json({ message: 'Hello world !', apiKey: process.env.API_KEY });
});

app.listen({ port: PORT, host: HOST }, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});

