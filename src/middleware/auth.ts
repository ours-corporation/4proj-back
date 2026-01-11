import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: 'Unauthorized' });
        const token = header.split(' ')[1];
        const payload = verifyAccessToken(token) as any;
        (req as any).user = { id: payload.id, email: payload.email };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};