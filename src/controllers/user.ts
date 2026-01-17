import {Request, Response} from 'express';
import { User } from '../models';
import {compareString, hashString} from '../services/hash';

export const getMe = async (req: Request, res: Response) => {
    try {
        const includeQuota = req.query.quota === 'true';

        const userId = (req as any).user.id;
        const user = await User.scope('withoutPassword').findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (includeQuota) {
            await user.reload({ include: ['quota'] });
        }
        console.log(user);
        return res.json(user);
    } catch (error) {
        console.error(error);
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

export const updatePassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { lastPassword, NewPassword } = req.body;

        if (!NewPassword) {
            return res.status(400).json({ message: 'Le mot de passe est requis' });
        }
        if (NewPassword.length < 12) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 12 caractères' });
        }
        if (!/[A-Z]/.test(NewPassword)) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins une lettre majuscule' });
        }
        if (!/[a-z]/.test(NewPassword)) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins une lettre minuscule' });
        }
        if (!/[0-9]/.test(NewPassword)) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins un chiffre' });
        }
        if (!/[!@#$%^&*]/.test(NewPassword)) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins un caractère spécial (! @ # $ % ^ & *)' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (!user.password) {
            return res.status(400).json({ 
                message: "Cet utilisateur n'a pas de mot de passe défini. Veuillez utiliser la procédure de réinitialisation." 
            });
        }

        const ok = await compareString(lastPassword, user.password);

        if (!ok) return res.status(400).json({ message: 'Ancien mot de passe incorrect' });

        user.password = await hashString(NewPassword);
        await user.save();

        return res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
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
