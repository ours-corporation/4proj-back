import { Folder, File } from '../models';

class FolderService {
    
    async createFolder(name: string, userId: number, parentId: number | null) {
        
        if (parentId) {
            const parentFolder = await Folder.findByPk(parentId);

            if (!parentFolder) {
                throw new Error("Dossier parent introuvable.");
            }

            if (parentFolder.user_id !== userId) {
                throw new Error("Accès interdit : Vous ne pouvez pas créer de dossier ici.");
            }
        }

        const newFolder = await Folder.create({
            name: name,
            user_id: userId,
            parent_id: parentId // Peut être null (racine) ou un ID (sous-dossier)
        });

        return newFolder;
    }

    async getFolderContent(folderId: number | null, userId: number) {
        
        let currentFolder = null;
        let breadcrumbs = [];

        if (folderId) {
            currentFolder = await Folder.findByPk(folderId);

            if (!currentFolder) {
                throw new Error("Dossier introuvable.");
            }
            if (currentFolder.user_id !== userId) {
                throw new Error("Accès interdit.");
            }

            let tempFolder: any = currentFolder;
            while (tempFolder) {
                breadcrumbs.unshift({ // Ajoute au début du tableau
                    id: tempFolder.id,
                    name: tempFolder.name
                });

                if (tempFolder.parent_id) {
                    tempFolder = await Folder.findByPk(tempFolder.parent_id);
                } else {
                    tempFolder = null; // On est arrivé à la racine
                }
            }
        }

        // Ajout de la "Racine" tout au début du fil d'ariane
        breadcrumbs.unshift({ id: null, name: 'Accueil' });

        const folders = await Folder.findAll({
            where: {
                user_id: userId,
                parent_id: folderId, // null pour la racine, ou l'ID du dossier
                trashed_at: null
            },
            order: [['name', 'ASC']] // Tri alphabétique
        });

        // Les fichiers
        const files = await File.findAll({
            where: {
                user_id: userId,
                folder_id: folderId, // null pour la racine, ou l'ID du dossier
                trashed_at: null
            },
            order: [['name', 'ASC']]
        });

        return {
            current: currentFolder,
            breadcrumbs: breadcrumbs,
            folders: folders,
            files: files
        };
    }
}

export default new FolderService();