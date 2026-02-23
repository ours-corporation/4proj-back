import * as fs from 'fs'; // synchronous helpers
import { promises as fsPromises } from 'fs'; // async fs.promises
import path from 'path';      
import { v4 as uuidv4 } from 'uuid'; 
import { User, File, Folder, Quota } from '../models';
import { existsSync } from 'fs';
import ShareService from './share';

const UPLOAD_ROOT = '/app/uploads';

class FileService {

    
    async uploadFile(userId: number, file: Express.Multer.File, parentId: number | null) {
        
        const user = await User.findByPk(userId, { include: [Quota] });
        if (!user) throw new Error("Utilisateur introuvable");

        const currentUsage = BigInt(user.used_bytes);
        const fileSize = BigInt(file.size);
        const quotaLimit = user.quota_id ? BigInt(32212254720) : BigInt(0); // 30GB
        
        if ((currentUsage + fileSize) > quotaLimit) {
            throw new Error("Quota de stockage dépassé (30 Go max).");
        }

        const physicalKey = uuidv4(); 
        const userDir = path.join(UPLOAD_ROOT, userId.toString());
        
        await fsPromises.mkdir(userDir, { recursive: true });

        const physicalPath = path.join(userDir, physicalKey);

        try {
            await fsPromises.writeFile(physicalPath, file.buffer);

            const extWithDot = path.extname(file.originalname);
            const extension = extWithDot ? extWithDot.substring(1) : null; 
            const name = path.basename(file.originalname, extWithDot);

            const newFile = await File.create({
                user_id: userId,
                folder_id: parentId,
                name: name,
                extension: extension,
                physical_key: physicalKey,
                size_bytes: fileSize,
                mime_type: file.mimetype
            });

            user.used_bytes = Number(currentUsage + fileSize); 
            await user.save();

            return newFile;

        } catch (error) {
            try {
                await fsPromises.unlink(physicalPath);
            } catch (unlinkError) {
                console.error("Erreur lors du nettoyage du fichier orphelin:", unlinkError);
            }
            throw error;
        }
    }

    async uploadMultipleFiles(files: Express.Multer.File[], userId: number, folderId: number | null) {
        if (!files || files.length === 0) {
            throw new Error("Aucun fichier à uploader.");
        }

        const userDir = path.join(UPLOAD_ROOT, userId.toString());
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        const uploadedFiles = await Promise.all(files.map(async (file) => {
            const physicalKey = uuidv4();
            const targetPath = path.join(userDir, physicalKey);

            fs.writeFileSync(targetPath, file.buffer);
            
            const newFile = await File.create({
                name: file.originalname,
                fullName: file.originalname,
                size: file.size,
                mime_type: file.mimetype,
                physical_key: physicalKey,
                user_id: userId,
                folder_id: folderId
            });

            return newFile;
        }));

        return uploadedFiles;
    }

    async getPhysicalPath(fileId: number, userId: number): Promise<string> {
        const file = await File.findOne({ where: { id: fileId, user_id: userId } });
        
        if (!file) throw new Error("Fichier introuvable ou accès refusé");

        return path.join(UPLOAD_ROOT, userId.toString(), file.physical_key);
    }

    async getFileForDownload(fileId: number, userId: number) {
        const file = await File.findByPk(fileId);

        if (!file) {
            throw new Error("Fichier introuvable.");
        }

        await this.verifyFileAccessOrThrow(file, userId);

        const filePath = path.join('/app/uploads', file.user_id.toString(), file.physical_key);

        if (!existsSync(filePath)) {
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
        const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    
        if (!file) throw new Error("Fichier introuvable.");

        if (updates.name) {
            const ext = path.extname(updates.name);
            if (ext) {
                updates.name = path.basename(updates.name, ext);
            }
            await file.update({ name: updates.name });
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
}

export default new FileService();