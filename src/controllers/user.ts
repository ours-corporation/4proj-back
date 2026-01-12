import { Request, Response } from 'express';
import User from '../models/User';
import { compareString, hashString } from '../services/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/jwt';

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.scope('withoutPassword').findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }
        return res.json({ user });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        if (isNaN(Number(userId))) {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        const user = await User.scope('withoutPassword').findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }
        return res.json({ user });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}
