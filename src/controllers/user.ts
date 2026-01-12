import { Request, Response } from 'express';
import User from '../models/User';
import {registerValidator} from "../validator/auth";
import {updateUserValidator} from "../validator/user";

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

export const updateMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { email, username } = req.body;

        const actualEmail = (await User.findByPk(userId))?.email;
        if (!actualEmail) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (await updateUserValidator(req, res, actualEmail)) return;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (email) {
            user.email = email;
        }
        if (username) {
            user.username = username;
        }

        await user.save();

        const updatedUser = await User.scope('withoutPassword').findByPk(userId);
        return res.json({ user: updatedUser });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

export const deleteMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        await user.destroy();

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

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
