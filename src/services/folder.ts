import { Folder, File } from '../models';

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

    /**
     * Récupère le contenu d'un dossier (fichiers + sous-dossiers)
     * et génère le fil d'ariane.
     */
    async getFolderContent(folderId: number | null, userId: number) {
        
        let currentFolder = null;
        let breadcrumbs = [];

        // 1. SÉCURITÉ & RÉCUPÉRATION DU DOSSIER COURANT
        if (folderId) {
            currentFolder = await Folder.findByPk(folderId);

            if (!currentFolder) {
                throw new Error("Dossier introuvable.");
            }
            if (currentFolder.user_id !== userId) {
                throw new Error("Accès interdit.");
            }

            // 2. GÉNÉRATION DU FIL D'ARIANE (Boucle pour remonter aux parents)
            // On part du dossier actuel et on remonte jusqu'à la racine
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

        // 3. RÉCUPÉRATION DU CONTENU (Enfants)
        // Les sous-dossiers
        const folders = await Folder.findAll({
            where: {
                user_id: userId,
                parent_id: folderId // null pour la racine, ou l'ID du dossier
            },
            order: [['name', 'ASC']] // Tri alphabétique
        });

        // Les fichiers
        const files = await File.findAll({
            where: {
                user_id: userId,
                folder_id: folderId // null pour la racine, ou l'ID du dossier
            },
            order: [['name', 'ASC']]
        });

        return {
            current: currentFolder, // Infos du dossier actuel (ou null si racine)
            breadcrumbs: breadcrumbs, // Chemin pour la navigation (Accueil > Vacances > 2023)
            folders: folders,       // Liste des dossiers
            files: files            // Liste des fichiers
        };
    }
}

export default new FolderService();