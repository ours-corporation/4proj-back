import fs, { unlink } from 'fs/promises'; // asynchrone
import { existsSync } from 'fs'; // synchrone
import path from 'path';      
import { v4 as uuidv4 } from 'uuid'; 
import { User, File, Folder, Quota } from '../models';

// Le chemin racine défini dans ton docker-compose
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
        
        await fs.mkdir(userDir, { recursive: true });

        const physicalPath = path.join(userDir, physicalKey);

        try {
            await fs.writeFile(physicalPath, file.buffer);

            // Découpage du nom et de l'extension
            const extWithDot = path.extname(file.originalname);
            const extension = extWithDot ? extWithDot.substring(1) : null; 
            const name = path.basename(file.originalname, extWithDot); 
            // ---------------------------------------------

            const newFile = await File.create({
                user_id: userId,
                folder_id: parentId,
                name: name,
                extension: extension,
                physical_key: physicalKey,
                size_bytes: fileSize,
                mime_type: file.mimetype
            });

            // Mise à jour quota
            user.used_bytes = Number(currentUsage + fileSize); 
            await user.save();

            return newFile;

        } catch (error) {
            try {
                await fs.unlink(physicalPath);
            } catch (unlinkError) {
                console.error("Erreur lors du nettoyage du fichier orphelin:", unlinkError);
            }
            throw error;
        }
    }

    async getPhysicalPath(fileId: number, userId: number): Promise<string> {
        const file = await File.findOne({ where: { id: fileId, user_id: userId } });
        
        if (!file) throw new Error("Fichier introuvable ou accès refusé");

        return path.join(UPLOAD_ROOT, userId.toString(), file.physical_key);
    }

    async getFileForDownload(fileId: number, userId: number) {
        // Récupérer les métadonnées en BDD
        const file = await File.findOne({
            where: { id: fileId, user_id: userId }
        });

        if (!file) {
            throw new Error("Fichier introuvable ou accès interdit.");
        }

        // Construire le chemin absolu vers le fichier physique
        const filePath = path.join('/app/uploads', userId.toString(), file.physical_key);

        // Vérifier que le fichier existe physiquement sur le disque
        if (!existsSync(filePath)) {
            throw new Error("Erreur critique : Le fichier physique est introuvable.");
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

        // Si on demande un changement de nom
        if (updates.name) {
            const ext = path.extname(updates.name);
            if (ext) {
                updates.name = path.basename(updates.name, ext);
            }
            // On met à jour SEULEMENT le champ name. L'extension en base ne bouge pas.
            await file.update({ name: updates.name });
        }
        return file;
    }
}

export default new FileService();