import { File, Folder, User } from '../models';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_ROOT = '/app/uploads';

class TrashService {

    async moveToTrash(type: 'file' | 'folder', id: number, userId: number) {
        const batchId = uuidv4();
        const now = new Date();

        if (type === 'file') {
            await File.update(
                { trashed_at: now, deletion_id: batchId },
                { where: { id, user_id: userId, trashed_at: null } }
            );
        } else {
            await this.trashFolderRecursively(id, userId, batchId, now);
        }
    }

    async restoreFromTrash(type: 'file' | 'folder', id: number, userId: number) {
        if (type === 'file') {
            const file = await File.findOne({ where: { id, user_id: userId } });
            if (!file) throw new Error("Fichier introuvable");

            // Orphan handling: if the parent no longer exists or is still in trash, restore to root
            let newParentId = file.folder_id;
            if (file.folder_id) {
                const parent = await Folder.findByPk(file.folder_id);
                if (!parent || parent.trashed_at !== null) {
                    newParentId = null;
                }
            }

            await file.update({
                trashed_at: null,
                deletion_id: null,
                folder_id: newParentId
            });

        } else {
            await this.restoreFolderRecursively(id, userId);
        }
    }

    async getTrashContent(userId: number) {
        const allTrashedFolders = await Folder.findAll({
            where: { user_id: userId, trashed_at: { [Op.not]: null } }
        });
        const allTrashedFiles = await File.findAll({
            where: { user_id: userId, trashed_at: { [Op.not]: null } }
        });

        const visibleFolders = await Promise.all(allTrashedFolders.map(async (folder) => {
            if (!folder.parent_id) return folder;

            const parent = await Folder.findByPk(folder.parent_id);

            if (!parent || !parent.trashed_at) return folder;

            if (folder.deletion_id !== parent.deletion_id) {
                return folder;
            }

            return null;
        }));

        const visibleFiles = await Promise.all(allTrashedFiles.map(async (file) => {
            if (!file.folder_id) return file;

            const parent = await Folder.findByPk(file.folder_id);

            if (!parent || !parent.trashed_at) return file;

            if (file.deletion_id !== parent.deletion_id) {
                return file;
            }
            return null;
        }));

        return {
            folders: visibleFolders.filter(f => f !== null),
            files: visibleFiles.filter(f => f !== null)
        };
    }

    async deletePermanently(type: 'file' | 'folder', id: number, userId: number) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error("User introuvable");

        if (type === 'file') {
            await this.hardDeleteFile(id, userId, user);
        } else {
            await this.hardDeleteFolderRecursively(id, userId, user);
        }

        await user.save();
    }

    async emptyTrash(userId: number) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error("User introuvable");

        const trashedFiles = await File.findAll({
            where: { user_id: userId, trashed_at: { [Op.not]: null } }
        });

        for (const file of trashedFiles) {
            await this.hardDeleteFile(file.id, userId, user);
        }

        const trashedFolders = await Folder.findAll({
            where: { user_id: userId, trashed_at: { [Op.not]: null } }
        });

        for (const folder of trashedFolders) {
            const stillExists = await Folder.findByPk(folder.id);
            if (stillExists) {
                await Folder.destroy({ where: { id: folder.id } });
            }
        }

        await user.save();
    }

    private async trashFolderRecursively(folderId: number, userId: number, batchId: string, date: Date) {
        await Folder.update(
            { trashed_at: date, deletion_id: batchId },
            { where: { id: folderId, user_id: userId, trashed_at: null } }
        );

        await File.update(
            { trashed_at: date, deletion_id: batchId },
            { where: { folder_id: folderId, user_id: userId, trashed_at: null } }
        );

        const subFolders = await Folder.findAll({ where: { parent_id: folderId, user_id: userId } });
        for (const sub of subFolders) {
            await this.trashFolderRecursively(sub.id, userId, batchId, date);
        }
    }

    private async restoreFolderRecursively(folderId: number, userId: number) {
        await Folder.update({ trashed_at: null, deletion_id: null }, { where: { id: folderId, user_id: userId } });
        await File.update({ trashed_at: null, deletion_id: null }, { where: { folder_id: folderId, user_id: userId } });

        const subFolders = await Folder.findAll({ where: { parent_id: folderId, user_id: userId } });
        for (const sub of subFolders) {
            await this.restoreFolderRecursively(sub.id, userId);
        }
    }

    private async hardDeleteFile(fileId: number, userId: number, userModel: User) {
        const file = await File.findOne({ where: { id: fileId, user_id: userId } });
        if (!file) return;

        const filePath = path.join(UPLOAD_ROOT, userId.toString(), file.physical_key);
        try {
            await fs.unlink(filePath);
        } catch (e) {
            console.warn(`Fichier physique introuvable lors de la suppression: ${file.physical_key}`);
        }

        userModel.used_bytes = Math.max(0, Number(userModel.used_bytes) - Number(file.size_bytes));

        await file.destroy();
    }

    private async hardDeleteFolderRecursively(folderId: number, userId: number, userModel: User) {
        const files = await File.findAll({ where: { folder_id: folderId, user_id: userId } });
        for (const file of files) {
            await this.hardDeleteFile(file.id, userId, userModel);
        }

        const subFolders = await Folder.findAll({ where: { parent_id: folderId, user_id: userId } });
        for (const sub of subFolders) {
            await this.hardDeleteFolderRecursively(sub.id, userId, userModel);
        }

        await Folder.destroy({ where: { id: folderId } });
    }
}

export default new TrashService();
