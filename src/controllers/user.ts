import {Request, Response} from 'express';
import { User, File, Quota } from '../models';
import {compareString, hashString} from '../services/hash';
import ProfilePictureService, { ProfilePictureQuality } from '../services/profilePicture';
import { Op, fn, col, literal } from 'sequelize';

export const getMe = async (req: Request, res: Response) => {
    try {
        const includeQuota = req.query.quota === 'true';

        const userId = req.user.id;
        const user = await User.scope('withoutPassword').findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (includeQuota) {
            await user.reload({ include: ['quota'] });
        }
        return res.json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};


export const updateMe = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
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
        const userId = req.user.id;

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
        const userId = req.user.id;
        const { lastPassword, NewPassword } = req.body;

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

export const uploadProfilePicture = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Aucun fichier fourni.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        // Supprimer l'ancienne photo si elle existe
        if (user.profile_picture_key) {
            ProfilePictureService.deleteProfilePicture(userId, user.profile_picture_key);
        }

        const key = await ProfilePictureService.saveProfilePicture(file, userId);
        user.profile_picture_key = key;
        await user.save();

        return res.status(200).json({ message: 'Photo de profil mise à jour avec succès.' });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Erreur lors de l\'upload.' });
    }
};

export const getProfilePicture = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }

        const quality = (req.query.quality as ProfilePictureQuality) || 'medium';
        const validQualities: ProfilePictureQuality[] = ['low', 'medium', 'high'];
        if (!validQualities.includes(quality)) {
            return res.status(400).json({ message: 'Qualité invalide. Valeurs acceptées : low, medium, high.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (!user.profile_picture_key) {
            return res.status(404).json({ message: 'Aucune photo de profil.' });
        }

        const buffer = await ProfilePictureService.getProfilePictureBuffer(userId, user.profile_picture_key, quality);

        res.set('Content-Type', 'image/webp');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(buffer);
    } catch (error: any) {
        if (error.message === 'Photo de profil introuvable.') {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

export const deleteProfilePicture = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (!user.profile_picture_key) {
            return res.status(404).json({ message: 'Aucune photo de profil à supprimer.' });
        }

        ProfilePictureService.deleteProfilePicture(userId, user.profile_picture_key);
        user.profile_picture_key = null;
        await user.save();

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

export const getStorageStats = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, { include: [Quota] });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const quotaBytes = user.quota ? Number(user.quota.quota_bytes) : 0;
        const usedBytes = Number(user.used_bytes);
        const freeBytes = Math.max(0, quotaBytes - usedBytes);

        // Récupérer les fichiers non supprimés groupés par mime_type
        const files = await File.findAll({
            where: { user_id: userId, trashed_at: null },
            attributes: ['mime_type', [fn('SUM', col('size_bytes')), 'total_bytes']],
            group: ['mime_type'],
            raw: true,
        }) as unknown as { mime_type: string; total_bytes: string }[];

        const categoryBytes = { video: 0, photo: 0, document: 0, other: 0 };

        for (const row of files) {
            const mime = row.mime_type || '';
            const bytes = Number(row.total_bytes);
            if (mime.startsWith('video/')) {
                categoryBytes.video += bytes;
            } else if (mime.startsWith('image/')) {
                categoryBytes.photo += bytes;
            } else if (
                mime.startsWith('text/') ||
                mime === 'application/pdf' ||
                mime.startsWith('application/vnd.') ||
                mime === 'application/msword' ||
                mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mime === 'application/vnd.ms-excel' ||
                mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                mime === 'application/vnd.ms-powerpoint' ||
                mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ) {
                categoryBytes.document += bytes;
            } else {
                categoryBytes.other += bytes;
            }
        }

        const toPercent = (bytes: number) =>
            quotaBytes > 0 ? Math.round((bytes / quotaBytes) * 10000) / 100 : 0;

        return res.json({
            quota_bytes: quotaBytes,
            used_bytes: usedBytes,
            free_bytes: freeBytes,
            used_percent: toPercent(usedBytes),
            free_percent: toPercent(freeBytes),
            categories: {
                video: { bytes: categoryBytes.video, percent: toPercent(categoryBytes.video) },
                photo: { bytes: categoryBytes.photo, percent: toPercent(categoryBytes.photo) },
                document: { bytes: categoryBytes.document, percent: toPercent(categoryBytes.document) },
                other: { bytes: categoryBytes.other, percent: toPercent(categoryBytes.other) },
            },
        });
    } catch (error) {
        console.error(error);
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
