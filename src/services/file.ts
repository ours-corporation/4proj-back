import fs from 'fs';
import path from 'path';      
import { v4 as uuidv4 } from 'uuid'; 
import { User, File, Quota } from '../models';
import ShareService from './share';
import FolderService from './folder';
import ThumbnailService from './thumbnail';

const UPLOAD_ROOT = '/app/uploads';

class FileService {

    async uploadSingleFile(file: Express.Multer.File, userId: number, folderId: number | null) {
        if (!file) throw new Error("Aucun fichier à uploader.");

        try {
            await this.checkUserQuota(userId, file.size);
        } catch (error) {
            this.cleanupTempFiles([file]);
            throw error;
        }

        const uploadedFiles = await this.processAndSaveFiles([file], userId, folderId);
        return uploadedFiles[0]; 
    }

    async uploadMultipleFiles(files: Express.Multer.File[], userId: number, folderId: number | null) {
        if (!files || files.length === 0) throw new Error("Aucun fichier à uploader.");

        const totalIncomingSize = files.reduce((acc, file) => acc + file.size, 0);

        const MAX_BATCH_SIZE = 500 * 1024 * 1024;
        if (totalIncomingSize > MAX_BATCH_SIZE) {
            this.cleanupTempFiles(files);
            throw new Error("Le poids total de cet envoi dépasse la limite autorisée de 500 Mo.");
        }

        try {
            await this.checkUserQuota(userId, totalIncomingSize);
        } catch (error) {
            this.cleanupTempFiles(files);
            throw error;
        }

        return await this.processAndSaveFiles(files, userId, folderId);
    }

    async getPhysicalPath(fileId: number, userId: number): Promise<string> {
        const file = await this.findFileOrThrow(fileId);

        await this.verifyFileAccessOrThrow(file, userId);

        return path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);
    }

    async getFileForDownload(fileId: number, userId: number) {
        const file = await this.findFileOrThrow(fileId);

        await this.verifyFileAccessOrThrow(file, userId);

        const filePath = path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);

        if (!fs.existsSync(filePath)) {
            throw new Error("Erreur : Le fichier physique est introuvable.");
        }

        return {
            path: filePath,
            name: file.name,
            mimeType: file.mime_type
        };
    }

    async getRecentFiles(userId: number, limit: number) {
        return await File.findAll({
            where: {
                user_id: userId,
                trashed_at: null
            },
            order: [['createdAt', 'DESC']],
            limit: limit
        });
    }

    async updateFile(fileId: number, userId: number, updates: { name?: string }) {
        const file = await this.findFileOrThrow(fileId);

        const access = await this.verifyFileAccessOrThrow(file, userId);
        if (access !== 'OWNER' && access !== 'WRITE') {
            throw new Error("Accès interdit pour ce fichier.");
        }

        if (updates.name) {
            const cleanNewName = path.basename(updates.name, path.extname(updates.name));
            await file.update({ name: cleanNewName });
        }
        return file;
    }

    async moveFile(fileId: number, userId: number, destinationFolderId: number | null) {
        const file = await this.findFileOrThrow(fileId);

        if (file.trashed_at) throw new Error("Impossible de déplacer un fichier dans la corbeille.");

        const access = await this.verifyFileAccessOrThrow(file, userId);
        if (access !== 'OWNER' && access !== 'WRITE') {
            throw new Error("Accès interdit pour ce fichier.");
        }

        if (destinationFolderId !== null) {
            await FolderService.verifyDestinationFolder(destinationFolderId, userId);
        } else {
            if (file.user_id !== userId) {
                throw new Error("Seul le propriétaire peut déplacer un fichier vers la racine.");
            }
        }

        await file.update({ folder_id: destinationFolderId });
        return file;
    }

    async copyFile(fileId: number, userId: number) {
        const file = await this.findFileOrThrow(fileId);

        const access = await this.verifyFileAccessOrThrow(file, userId);
        if (access !== 'OWNER' && access !== 'WRITE') {
            throw new Error("Accès interdit pour ce fichier.");
        }

        if (file.trashed_at) throw new Error("Impossible de copier un fichier dans la corbeille.");

        await this.checkUserQuota(userId, file.size_bytes);

        const existingNames = await this.getExistingFileNames(file.folder_id);
        const copyName = this.generateCopyName(file.name, existingNames);

        const sourcePath = path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);
        const newPhysicalKey = uuidv4();
        const userDir = path.join(UPLOAD_ROOT, userId.toString());
        const targetPath = path.join(userDir, newPhysicalKey);

        await fs.promises.mkdir(userDir, { recursive: true });
        await fs.promises.copyFile(sourcePath, targetPath);

        await ThumbnailService.copyThumbnails(file.physical_key, file.user_id, newPhysicalKey, userId);

        const copiedFile = await File.create({
            name: copyName,
            extension: file.extension,
            size_bytes: file.size_bytes,
            mime_type: file.mime_type,
            physical_key: newPhysicalKey,
            user_id: userId,
            folder_id: file.folder_id
        });

        await User.update(
            { used_bytes: User.sequelize!.literal(`used_bytes + ${Number(file.size_bytes)}`) },
            { where: { id: userId } }
        );

        return copiedFile;
    }

    async getThumbnail(fileId: number, userId: number, size: 'small' | 'medium') {
        const file = await this.findFileOrThrow(fileId);
        await this.verifyFileAccessOrThrow(file, userId);

        if (!ThumbnailService.isImage(file.mime_type)) {
            throw new Error("Ce fichier n'est pas une image.");
        }

        const thumbPath = ThumbnailService.getThumbnailPath(file.physical_key, file.user_id, size);
        if (!fs.existsSync(thumbPath)) {
            throw new Error("Thumbnail introuvable.");
        }

        return { path: thumbPath, mimeType: 'image/webp' };
    }

    async getFileForStream(fileId: number, userId: number) {
        const file = await this.findFileOrThrow(fileId);
        await this.verifyFileAccessOrThrow(file, userId);

        const filePath = path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);

        if (!fs.existsSync(filePath)) {
            throw new Error("Erreur : Le fichier physique est introuvable.");
        }

        return {
            path: filePath,
            mimeType: file.mime_type,
            sizeBytes: Number(file.size_bytes)
        };
    }

    async moveMultipleItems(
        items: { type: 'file' | 'folder'; id: number }[],
        userId: number,
        destinationFolderId: number | null
    ) {
        const moved: { type: string; id: number }[] = [];
        const failed: { type: string; id: number; error: string }[] = [];

        for (const item of items) {
            try {
                if (item.type === 'file') {
                    await this.moveFile(item.id, userId, destinationFolderId);
                } else {
                    await FolderService.moveFolder(item.id, userId, destinationFolderId);
                }
                moved.push({ type: item.type, id: item.id });
            } catch (error: any) {
                failed.push({ type: item.type, id: item.id, error: error.message });
            }
        }

        return { moved, failed };
    }

    private async findFileOrThrow(fileId: number) {
        const file = await File.findByPk(fileId);
        if (!file) throw new Error("Fichier introuvable.");
        return file;
    }

    private async verifyFileAccessOrThrow(file: any, userId: number): Promise<string> {
        if (file.user_id === userId) {
            return 'OWNER';
        }
        
        const sharedPermission = await ShareService.hasFileAccess(userId, file);
        
        if (!sharedPermission) {
            throw new Error("Accès interdit pour ce fichier.");
        }
        
        return sharedPermission;
    }

    private async checkUserQuota(userId: number, incomingBytes: number) {
        const user = await User.findByPk(userId, { include: [Quota] });
        if (!user || !user.quota) {
            throw new Error("Utilisateur ou quota introuvable.");
        }

        const maxQuotaBytes = Number(user.quota.quota_bytes);
        const currentUsage = Number(user.used_bytes);

        if (currentUsage + incomingBytes > maxQuotaBytes) {
            throw new Error("Espace insuffisant. Vous avez atteint votre quota.");
        }
    }
    
    private async processAndSaveFiles(files: Express.Multer.File[], userId: number, folderId: number | null) {
        const userDir = path.join(UPLOAD_ROOT, userId.toString());
        await fs.promises.mkdir(userDir, { recursive: true });

        const savedFiles = await Promise.all(files.map(async (file) => {
            const physicalKey = uuidv4();
            const targetPath = path.join(userDir, physicalKey);

            await fs.promises.copyFile(file.path, targetPath);
            await fs.promises.unlink(file.path);

            const rawExt = path.extname(file.originalname);
            const baseName = rawExt
                ? path.basename(file.originalname, rawExt)
                : file.originalname;
            const extension = rawExt ? rawExt.slice(1) : null;

            const newFile = await File.create({
                name: baseName,
                extension,
                size_bytes: file.size,
                mime_type: file.mimetype,
                physical_key: physicalKey,
                user_id: userId,
                folder_id: folderId
            });

            await ThumbnailService.generateThumbnails(physicalKey, userId, targetPath, file.mimetype);

            return newFile;
        }));

        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        await User.update(
            { used_bytes: User.sequelize!.literal(`used_bytes + ${totalSize}`) },
            { where: { id: userId } }
        );

        return savedFiles;
    }

    private async getExistingFileNames(folderId: number | null): Promise<string[]> {
        const where: any = { folder_id: folderId, trashed_at: null };
        const files = await File.findAll({ where, attributes: ['name'] });
        return files.map((f: any) => f.name);
    }

    private generateCopyName(baseName: string, existingNames: string[]): string {
        const candidateName = `${baseName} (copie)`;
        if (!existingNames.includes(candidateName)) return candidateName;

        let counter = 2;
        while (existingNames.includes(`${baseName} (copie ${counter})`)) {
            counter++;
        }
        return `${baseName} (copie ${counter})`;
    }

    private cleanupTempFiles(files: Express.Multer.File[]) {
        for (const file of files) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
    }
}

export default new FileService();