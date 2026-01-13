import { Folder } from '../models';

class FolderService {
    
    /**
     * Crée un dossier logique en base de données
     */
    async createFolder(name: string, userId: number, parentId: number | null) {
        
        // 1. Si un parent est spécifié, on doit vérifier qu'il est valide
        if (parentId) {
            const parentFolder = await Folder.findByPk(parentId);

            // Vérification A : Le dossier existe-t-il ?
            if (!parentFolder) {
                throw new Error("Dossier parent introuvable.");
            }

            // Vérification B : Le dossier parent appartient-il bien à l'utilisateur ?
            // C'est CRUCIAL pour empêcher un user d'écrire chez un autre.
            if (parentFolder.user_id !== userId) {
                throw new Error("Accès interdit : Vous ne pouvez pas créer de dossier ici.");
            }
        }

        // 2. Création du dossier (Pointeur logique uniquement)
        const newFolder = await Folder.create({
            name: name,
            user_id: userId,
            parent_id: parentId // Peut être null (racine) ou un ID (sous-dossier)
        });

        return newFolder;
    }
}

export default new FolderService();