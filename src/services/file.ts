import fs from 'fs/promises'; // Pour manipuler les fichiers (async)
import path from 'path';      // Pour gérer les chemins de dossiers
import { v4 as uuidv4 } from 'uuid'; // Pour générer le nom physique unique
import { User, File, Folder } from '../models';

// Le chemin racine défini dans ton docker-compose
const UPLOAD_ROOT = '/app/uploads';

class FileService {

    
    async uploadFile(userId: number, file: Express.Multer.File, parentId: number | null) {
        
        const user = await User.findByPk(userId, { include: ['Quota'] });
        if (!user) throw new Error("Utilisateur introuvable");

        // Vérification du quota
        const currentUsage = BigInt(user.used_bytes);
        const fileSize = BigInt(file.size);
        const quotaLimit = user.quota_id ? BigInt(32212254720) : BigInt(0);
        
        if ((currentUsage + fileSize) > quotaLimit) {
            throw new Error("Quota de stockage dépassé (30 Go max).");
        }

        const physicalKey = uuidv4(); 
        const userDir = path.join(UPLOAD_ROOT, userId.toString());
        
        // On s'assure que le dossier de l'utilisateur existe, sinon on le crée
        await fs.mkdir(userDir, { recursive: true });

        // Chemin complet du fichier final
        const physicalPath = path.join(userDir, physicalKey);

        try {
            await fs.writeFile(physicalPath, file.buffer);

            const newFile = await File.create({
                user_id: userId,
                folder_id: parentId, // Peut être null si à la racine
                name: file.originalname,
                physical_key: physicalKey, // Le lien vers le fichier sur le disque
                size_bytes: fileSize,
                mime_type: file.mimetype
            });

            // Mise à jour de l'espace utilisé par l'utilisateur
            user.used_bytes = (currentUsage + fileSize); 
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
}

export default new FileService();