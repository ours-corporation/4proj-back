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
            permission: 'READ'
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
            defaults: { permission: permission }
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
                { model: User, as: 'owner', attributes: ['username'] }
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
        const shares = await Share.findAll({
            where: { recipient_id: userId },
            include: [
                { model: File },
                { model: Folder },
                { model: User, as: 'owner', attributes: ['id', 'username', 'email'] }
            ]
        });

        const files: any[] = [];
        const folders: any[] = [];

        for (const share of shares) {
            if (share.file) {
                files.push({
                    ...share.file.toJSON(), 
                    permission: share.permission,
                    share_id: share.id, 
                    owner: share.owner
                });
            } else if (share.folder) {
                folders.push({
                    ...share.folder.toJSON(),
                    permission: share.permission,
                    share_id: share.id,
                    owner: share.owner
                });
            }
        }

        return { files, folders };
    }

    async revokeShare(ownerId: number, shareId: number) {
        const share = await Share.findOne({ where: { id: shareId, owner_id: ownerId } });
        if (!share) throw new Error("Partage introuvable ou vous n'êtes pas le propriétaire.");
        await share.destroy();
    }

    async hasFolderAccess(userId: number, folderId: number): Promise<'READ' | 'WRITE' | null> {
        let currentFolderId: number | null = folderId;

        while (currentFolderId !== null) {
            const share = await Share.findOne({
                where: {
                    recipient_id: userId,
                    folder_id: currentFolderId
                }
            });

            if (share) {
                return share.permission;
            }

            const fetchedFolder: Folder | null = await Folder.findByPk(currentFolderId);
            
            if (!fetchedFolder) return null;
            
            currentFolderId = fetchedFolder.parent_id;
        }

        return null;
    }
    
    private async verifyOwnership(userId: number, type: 'file' | 'folder', id: number) {
        if (type === 'file') {
            const file = await File.findOne({ where: { id, user_id: userId } });
            if (!file) throw new Error("Fichier introuvable ou vous n'avez pas les droits.");
        } else {
            const targetFolder = await Folder.findOne({ where: { id, user_id: userId } });
            if (!targetFolder) throw new Error("Dossier introuvable ou vous n'avez pas les droits.");
        }
    }
    
    async hasFileAccess(userId: number, file: any): Promise<'READ' | 'WRITE' | null> {
        const share = await Share.findOne({
            where: {
                recipient_id: userId,
                file_id: file.id
            }
        });

        if (share) {
            return share.permission;
        }

        if (file.folder_id) {
            return await this.hasFolderAccess(userId, file.folder_id);
        }

        return null;
    }
}

export default new ShareService();