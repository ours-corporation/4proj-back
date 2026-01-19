import { Folder, File, Share } from '../models';

class FolderService {
    
    async createFolder(name: string, userId: number, parentId: number | null) {
        if (parentId) {
            const parentFolder = await Folder.findByPk(parentId);

            if (!parentFolder) {
                throw new Error("Dossier parent introuvable.");
            }

            if (parentFolder.user_id !== userId) {
                // Vérifier si on a le droit d'écriture via partage
                const access = await this.hasFolderAccess(userId, parentId);
                if (access !== 'WRITE') {
                     throw new Error("Accès interdit : Vous ne pouvez pas créer de dossier ici.");
                }
            }
        }

        const newFolder = await Folder.create({
            name: name,
            user_id: userId, 
            parent_id: parentId
        });

        return newFolder;
    }

    async getFolderContent(folderId: number | null, userId: number) {
        
        let currentFolder = null;
        let breadcrumbs: any[] = [];
        let permission: 'READ' | 'WRITE' | 'OWNER' = 'OWNER'; // Par défaut OWNER (pour la racine)

        if (folderId) {
            currentFolder = await Folder.findByPk(folderId);

            if (!currentFolder) {
                throw new Error("Dossier introuvable.");
            }

            if (currentFolder.user_id === userId) {
                permission = 'OWNER';
            } else {
                const sharedPermission = await this.hasFolderAccess(userId, folderId);
                
                if (!sharedPermission) {
                    throw new Error("Accès interdit.");
                }
                permission = sharedPermission;
            }

            // Construction du fil d'ariane
            let tempFolder: any = currentFolder;
            while (tempFolder) {
                breadcrumbs.unshift({
                    id: tempFolder.id,
                    name: tempFolder.name
                });

                if (tempFolder.parent_id) {
                    tempFolder = await Folder.findByPk(tempFolder.parent_id);
                } else {
                    tempFolder = null;
                }
            }
        }

        breadcrumbs.unshift({ id: null, name: 'Accueil' });

        const contentWhereClause: any = {
            trashed_at: null
        };

        if (folderId) {
            // Dans un dossier spécifique
            contentWhereClause.parent_id = folderId; // Pour les dossiers enfants
        } else {
            // À la racine
            contentWhereClause.parent_id = null;
            contentWhereClause.user_id = userId;
        }

        // Requête Dossiers
        const folders = await Folder.findAll({
            where: contentWhereClause,
            order: [['name', 'ASC']]
        });

        // Requête Fichiers
        const fileWhereClause: any = {
            trashed_at: null
        };
        if (folderId) {
            fileWhereClause.folder_id = folderId;
        } else {
            fileWhereClause.folder_id = null;
            fileWhereClause.user_id = userId;
        }

        const files = await File.findAll({
            where: fileWhereClause,
            order: [['name', 'ASC']]
        });

        return {
            current: currentFolder ? { ...currentFolder.toJSON(), permission } : null,
            breadcrumbs: breadcrumbs,
            folders: folders,
            files: files
        };
    }

    // Helper pour vérifier si un utilisateur a accès à un dossier partagé
    async hasFolderAccess(userId: number, folderId: number): Promise<'READ' | 'WRITE' | null> {
        let currentFolderId: number | null = folderId;

        while (currentFolderId !== null) {
            // 1. Partage direct ?
            const share = await Share.findOne({
                where: {
                    recipient_id: userId,
                    folder_id: currentFolderId
                }
            });

            if (share) {
                return share.permission;
            }

            // 2. Remonter au parent
            // CORRECTION ICI : On utilise bien Folder (la classe) pour chercher
            const fetchedFolder: Folder | null = await Folder.findByPk(currentFolderId);
            
            if (!fetchedFolder) return null;
            
            currentFolderId = fetchedFolder.parent_id;
        }

        return null;
    }
}

export default new FolderService();