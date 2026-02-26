import fs from 'fs';
import path from 'path';      
import { v4 as uuidv4 } from 'uuid'; 
import { User, File, Quota } from '../models';
import ShareService from './share';

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
        const file = await File.findByPk(fileId);
        
        if (!file) throw new Error("Fichier introuvable");

        await this.verifyFileAccessOrThrow(file, userId);

        return path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key);
    }

    async getFileForDownload(fileId: number, userId: number) {
        const file = await File.findByPk(fileId);

        if (!file) {
            throw new Error("Fichier introuvable.");
        }

        await this.verifyFileAccessOrThrow(file, userId);

        const filePath = path.join('/app/uploads', file.user_id.toString(), file.physical_key);

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
        const file = await File.findByPk(fileId);
    
        if (!file) throw new Error("Fichier introuvable.");

        const access = await this.verifyFileAccessOrThrow(file, userId);
        if(access!== 'OWNER' && access !== 'WRITE'){
            throw new Error("Accès interdit pour ce fichier.");
        }

        if (updates.name) {
            const originalExt = path.extname(file.fullName)

            const cleanNewName = path.basename(updates.name, path.extname(updates.name));
            
            await file.update({ 
                name: cleanNewName,
                fullName: cleanNewName + originalExt
            });
        }
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

        const currentUsage = await File.sum('size', { 
            where: { user_id: userId } 
        }) || 0;

        if (currentUsage + incomingBytes > maxQuotaBytes) {
            const usedGb = (currentUsage / 1024 / 1024 / 1024).toFixed(2);
            const maxGb = (maxQuotaBytes / 1024 / 1024 / 1024).toFixed(2);
            throw new Error(`Espace insuffisant. Vous avez atteint votre quota.`);
        }
    }
    
    private async processAndSaveFiles(files: Express.Multer.File[], userId: number, folderId: number | null) {
        const userDir = path.join(UPLOAD_ROOT, userId.toString());
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        return await Promise.all(files.map(async (file) => {
            const physicalKey = uuidv4();
            const targetPath = path.join(userDir, physicalKey);

            fs.renameSync(file.path, targetPath);

            return await File.create({
                name: file.originalname,
                fullName: file.originalname,
                size: file.size,
                mime_type: file.mimetype,
                physical_key: physicalKey,
                user_id: userId,
                folder_id: folderId
            });
        }));
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