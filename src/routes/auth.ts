import { Router, Request, Response } from 'express';
import {register, login} from "../controllers/auth";

const authRouter = Router();

// POST /api/login
authRouter.post('/login', (req: Request, res: Response) => {
    return login(req, res);
});

// POST /api/register
authRouter.post('/register', (req: Request, res: Response) => {
    return register(req, res);
});

// GET /api/auth/me
authRouter.get('/me', (req: Request, res: Response) => {
    res.json({ user: null });
});

export default authRouter;
