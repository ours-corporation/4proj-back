import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: 'Unauthorized' });
        const token = header.split(' ')[1];
        const payload = verifyAccessToken(token) as any;
        req.user = { id: payload.id, email: payload.email, terms_accepted: payload.terms_accepted === true };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const requireTerms = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user.terms_accepted) {
        return res.status(403).json({ error: 'terms_required' });
    }
    return next();
};