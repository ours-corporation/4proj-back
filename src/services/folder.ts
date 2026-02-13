import { Folder, File, Share } from '../models';
import archiver from 'archiver';
import path from 'path';
import { existsSync } from 'fs';
import ShareService from './share';

const UPLOAD_ROOT = '/app/uploads';

class FolderService {
    
    async createFolder(name: string, userId: number, parentId: number | null) {
        if (parentId) {
            const parentFolder = await Folder.findByPk(parentId);

            if (!parentFolder) {
                throw new Error("Dossier parent introuvable.");
            }

            if (parentFolder.user_id !== userId) {
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
        let permission: 'READ' | 'WRITE' | 'OWNER' = 'OWNER';

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
            contentWhereClause.parent_id = folderId;
        } else {
            contentWhereClause.parent_id = null;
            contentWhereClause.user_id = userId;
        }

        const folders = await Folder.findAll({
            where: contentWhereClause,
            order: [['name', 'ASC']]
        });

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

    async hasFolderAccess(userId: number, folderId: number): Promise<'READ' | 'WRITE' | null> {
        let currentFolderId: number | null = folderId;

        while (currentFolderId !== null) {
            const share = await Share.findOne({
                where: {
                    recipient_id: userId,
                    folder_id: currentFolderId
                }
            });

            if (share) {
                return share.permission;
            }

            const fetchedFolder: Folder | null = await Folder.findByPk(currentFolderId);
            
            if (!fetchedFolder) return null;
            
            currentFolderId = fetchedFolder.parent_id;
        }

        return null;
    }

    async createZipStream(folderId: number, folderName: string, outputStream: NodeJS.WritableStream): Promise<void> {
        const filesToZip = await this.getAllFilesInFolder(folderId, folderName);

        if (filesToZip.length === 0) {
            throw new Error("Le dossier est vide.");
        }

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.pipe(outputStream);

        archive.on('error', (err) => { throw err; });

        for (const file of filesToZip) {
            if (existsSync(file.physicalPath)) {
                archive.file(file.physicalPath, { name: file.archivePath });
            }
        }

        await archive.finalize();
    }

    async streamFolderZip(folderId: number, userId: number, outputStream: NodeJS.WritableStream): Promise<void> {
        const folder = await Folder.findByPk(folderId);
        if (!folder) throw new Error("Dossier introuvable.");

        if (folder.user_id !== userId) {
            const access = await ShareService.hasFolderAccess(userId, folderId);
            if (!access) throw new Error("Accès interdit pour le téléchargement.");
        }

        await this.createZipStream(folderId, folder.name, outputStream);
    }

    async getAllFilesInFolder(folderId: number, currentPath: string): Promise<{ physicalPath: string, archivePath: string }[]> {
        let results: { physicalPath: string, archivePath: string }[] = [];

        const files = await File.findAll({ 
            where: { folder_id: folderId, trashed_at: null } 
        });

        for (const file of files) {
            results.push({
                physicalPath: path.join(UPLOAD_ROOT, file.user_id.toString(), file.physical_key),
                archivePath: path.join(currentPath, file.fullName) 
            });
        }

        const subfolders = await Folder.findAll({ 
            where: { parent_id: folderId, trashed_at: null } 
        });

        for (const sub of subfolders) {
            const newPath = path.join(currentPath, sub.name);
            const subFiles = await this.getAllFilesInFolder(sub.id, newPath);
            results = results.concat(subFiles);
        }

        return results;
    }
}

export default new FolderService();