import { Share, User, File, Folder } from '../models';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

class ShareService {

    async createPublicLink(
        ownerId: number, 
        target: { type: 'file' | 'folder', id: number }, 
        options: { password?: string, expiresAt?: string }
    ) {
        await this.verifyOwnership(ownerId, target.type, target.id);

        const token = uuidv4();
        let passwordHash = null;
        let expiresAtDate = null;

        if (options.password) {
            passwordHash = await bcrypt.hash(options.password, 10);
        }

        if (options.expiresAt) {
            expiresAtDate = new Date(options.expiresAt);
            if (expiresAtDate <= new Date()) {
                throw new Error("La date d'expiration doit être dans le futur.");
            }
        }

        const share = await Share.create({
            owner_id: ownerId,
            file_id: target.type === 'file' ? target.id : null,
            folder_id: target.type === 'folder' ? target.id : null,
            token: token,
            password_hash: passwordHash,
            expires_at: expiresAtDate,
            permission: 'READ' // Public est toujours en lecture seule par sécurité
        });

        return {
            link: `${process.env.FRONTEND_URL}/s/${token}`,
            token: share.token,
            expiresAt: share.expires_at
        };
    }

    async createPrivateShare(
        ownerId: number,
        target: { type: 'file' | 'folder', id: number },
        recipientEmail: string,
        permission: 'READ' | 'WRITE'
    ) {
        await this.verifyOwnership(ownerId, target.type, target.id);

        const recipient = await User.findOne({ where: { email: recipientEmail } });
        if (!recipient) {
            throw new Error("Utilisateur introuvable avec cet email.");
        }

        if (recipient.id === ownerId) {
            throw new Error("Vous ne pouvez pas partager un élément avec vous-même.");
        }

        const whereClause = {
            owner_id: ownerId,
            recipient_id: recipient.id,
            ...(target.type === 'file' ? { file_id: target.id } : { folder_id: target.id })
        };

        const [share, created] = await Share.findOrCreate({
            where: whereClause,
            defaults: {
                permission: permission
            }
        });

        if (!created) {
            await share.update({ permission });
        }

        return share;
    }

    async getPublicContent(token: string, passwordInput?: string) {
        const share = await Share.findOne({ 
            where: { token },
            include: [
                { model: File },
                { model: Folder },
                { model: User, as: 'owner', attributes: ['username'] } // Pour afficher "Partagé par X"
            ]
        });

        if (!share) throw new Error("Lien invalide ou introuvable.");

        if (share.expires_at && new Date() > new Date(share.expires_at)) {
            throw new Error("Ce lien de partage a expiré.");
        }

        if (share.password_hash) {
            if (!passwordInput) {
                return { protected: true, shareId: share.id }; 
            }

            const match = await bcrypt.compare(passwordInput, share.password_hash);
            if (!match) {
                throw new Error("Mot de passe incorrect.");
            }
        }

        return {
            protected: false,
            type: share.file_id ? 'file' : 'folder',
            data: share.file || share.folder,
            owner: share.owner.username,
            permission: share.permission
        };
    }

    async getSharedWithMe(userId: number) {
        return await Share.findAll({
            where: { recipient_id: userId },
            include: [
                { model: File },
                { model: Folder },
                { model: User, as: 'owner', attributes: ['username', 'email'] }
            ]
        });
    }

    async revokeShare(ownerId: number, shareId: number) {
        const share = await Share.findOne({ where: { id: shareId, owner_id: ownerId } });
        if (!share) throw new Error("Partage introuvable ou vous n'êtes pas le propriétaire.");
        
        await share.destroy();
    }

    // --- Helpers ---

    private async verifyOwnership(userId: number, type: 'file' | 'folder', id: number) {
        if (type === 'file') {
            const file = await File.findOne({ where: { id, user_id: userId } });
            if (!file) throw new Error("Fichier introuvable ou vous n'avez pas les droits.");
        } else {
            const folder = await Folder.findOne({ where: { id, user_id: userId } });
            if (!folder) throw new Error("Dossier introuvable ou vous n'avez pas les droits.");
        }
    }
}

export default new ShareService();